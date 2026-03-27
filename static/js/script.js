document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('simulation-form');
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    let chartInstance = null;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        loadingDiv.style.display = 'block';
        resultsDiv.style.display = 'none';
        
        const data = {
            save: parseInt(document.getElementById('save').value),
            ward: document.getElementById('ward').value,
            ferite_nemiche: parseInt(document.getElementById('ferite_nemiche').value)
        };
        
        for (let p = 1; p <= 4; p++) {
            const units = parseInt(document.getElementById(`units_${p}`).value) || 0;
            const attModello = parseInt(document.getElementById(`attacchi_modello_${p}`).value) || 1;
            const campione = document.getElementById(`campione_${p}`).value;
            
            let attacchiTotali = units * attModello;
            if (campione === 'SI') attacchiTotali += 1;
            
            data[`attacchi_p${p}`] = attacchiTotali;
            data[`colpire_p${p}`] = parseInt(document.getElementById(`colpire_${p}`).value);
            data[`critico_p${p}`] = document.getElementById(`critico_${p}`).value;
            data[`soglia_critico_p${p}`] = parseInt(document.getElementById(`soglia_critico_${p}`).value);
            data[`ferire_p${p}`] = parseInt(document.getElementById(`ferire_${p}`).value);
            data[`rend_p${p}`] = parseInt(document.getElementById(`rend_${p}`).value);
            data[`danno_p${p}`] = document.getElementById(`danno_${p}`).value;
        }
        
        try {
            const response = await fetch('/api/simula', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            updateResults(result, data.ferite_nemiche);
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error during simulation.');
        } finally {
            loadingDiv.style.display = 'none';
        }
    });
    
    function updateResults(result, feriteNemiche) {
        resultsDiv.style.display = 'block';
        
        document.getElementById('media-danni').textContent = result.statistiche.media;
        document.getElementById('max-danni').textContent = result.statistiche.massimo;
        document.getElementById('min-danni').textContent = result.statistiche.minimo;
        
        const distribuzione = result.distribuzione;
        let eliminazioni = 0;
        for (const [danno, frequenza] of Object.entries(distribuzione)) {
            if (parseInt(danno) >= feriteNemiche) eliminazioni += frequenza;
        }
        const percEliminazione = (eliminazioni / 2000 * 100).toFixed(2);
        document.getElementById('perc-eliminazione').textContent = percEliminazione + '%';
        document.getElementById('conteggio-eliminazione').textContent = `(${eliminazioni}/2000)`;
        
        createChart(distribuzione);
        addExportButton();  // Aggiungi il pulsante dopo che il grafico è visibile
    }
    
    function createChart(distribuzione) {
        const ctx = document.getElementById('danniChart').getContext('2d');
        
        const labels = [];
        const data = [];
        let maxDanno = 0;
        
        const danni = Object.keys(distribuzione).map(Number);
        if (danni.length > 0) maxDanno = Math.max(...danni);
        
        for (let i = 0; i <= maxDanno; i++) {
            labels.push(i.toString());
            const frequenza = distribuzione[i] || 0;
            data.push((frequenza / 2000 * 100));
        }
        
        if (chartInstance) chartInstance.destroy();
        
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Percentage (%)',
                    data: data,
                    backgroundColor: 'rgba(191, 155, 92, 0.7)',
                    borderColor: 'rgba(191, 155, 92, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e0e0'
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1a1a1a',
                        titleColor: '#bf9b5c',
                        bodyColor: '#e0e0e0',
                        callbacks: {
                            label: function(context) {
                                const danno = parseInt(context.label);
                                const frequenza = distribuzione[danno] || 0;
                                return [
                                    `Percentage: ${context.raw.toFixed(2)}%`,
                                    `Frequency: ${frequenza} times`,
                                    `(out of 2000 simulations)`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Percentage (%)',
                            color: '#bf9b5c'
                        },
                        ticks: {
                            color: '#e0e0e0',
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Damage inflicted',
                            color: '#bf9b5c'
                        },
                        ticks: {
                            color: '#e0e0e0',
                            stepSize: 2,
                            autoSkip: true
                        }
                    }
                }
            }
        });
    }
    
    // === PULSANTE PER ESPORTARE IL GRAFICO ===
function addExportButton() {
    const chartCard = document.querySelector('.card:has(#danniChart)');
    if (chartCard && !document.getElementById('export-chart')) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'download-btn-container text-end mt-2';
        buttonContainer.innerHTML = `
            <button id="export-chart" class="btn btn-sm btn-outline-gold" style="display: inline-flex; align-items: center; gap: 8px;">
                <span>📸</span> Export Chart as PNG
            </button>
        `;
        chartCard.querySelector('.card-body').appendChild(buttonContainer);
        
        document.getElementById('export-chart').addEventListener('click', function() {
            const canvas = document.getElementById('danniChart');
            
            // Salva lo stato corrente del canvas
            const originalBackground = canvas.style.backgroundColor;
            const originalPadding = canvas.style.padding;
            const originalBorder = canvas.style.border;
            
            // Crea un canvas temporaneo per l'esportazione (assicura sfondo nero)
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            // Imposta dimensioni identiche al canvas originale
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            
            // Riempie con sfondo nero
            tempCtx.fillStyle = '#0a0a0a';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // Disegna il canvas originale sopra
            tempCtx.drawImage(canvas, 0, 0);
            
            // Forza stile per l'esportazione
            canvas.style.backgroundColor = '#0a0a0a';
            canvas.style.padding = '15px';
            canvas.style.border = '1px solid #3a3a3a';
            
            // Crea l'immagine dal canvas temporaneo (garantisce sfondo nero)
            setTimeout(() => {
                const link = document.createElement('a');
                link.download = 'aos_damage_distribution.png';
                // Usa il canvas temporaneo per l'esportazione
                link.href = tempCanvas.toDataURL('image/png');
                link.click();
                
                // Ripristina lo stile originale
                canvas.style.backgroundColor = originalBackground;
                canvas.style.padding = originalPadding;
                canvas.style.border = originalBorder;
            }, 100);
        });
    }
}

// === PULSANTE AZZERA UNITS ===
document.getElementById('reset-units').addEventListener('click', function() {
    for (let p = 1; p <= 4; p++) {
        const unitsField = document.getElementById(`units_${p}`);
        if (unitsField) unitsField.value = 0;
    }
    this.classList.add('btn-success');
    this.classList.remove('btn-secondary');
    this.innerHTML = '✅ UNITS RESET';
    setTimeout(() => {
        this.classList.remove('btn-success');
        this.classList.add('btn-secondary');
        this.innerHTML = '🔄 RESET UNITS';
    }, 2000);
});