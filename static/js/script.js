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
            console.error('Errore:', error);
            alert('Errore durante la simulazione.');
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
                    label: 'Percentuale (%)',
                    data: data,
                    backgroundColor: 'rgba(191, 155, 92, 0.7)',
                    borderColor: 'rgba(191, 155, 92, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Percentuale (%)' },
                        ticks: { callback: function(value) { return value.toFixed(1) + '%'; } }
                    },
                    x: { title: { display: true, text: 'Danni inflitti' } }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const danno = parseInt(context.label);
                                const frequenza = distribuzione[danno] || 0;
                                return [
                                    `Percentuale: ${context.raw.toFixed(2)}%`,
                                    `Frequenza: ${frequenza} volte`,
                                    `(su 2000 simulazioni)`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }
});

document.getElementById('reset-units').addEventListener('click', function() {
    for (let p = 1; p <= 4; p++) {
        const unitsField = document.getElementById(`units_${p}`);
        if (unitsField) unitsField.value = 0;
    }
    this.classList.add('btn-success');
    this.classList.remove('btn-secondary');
    this.innerHTML = '✅ UNITS AZZERATE';
    setTimeout(() => {
        this.classList.remove('btn-success');
        this.classList.add('btn-secondary');
        this.innerHTML = '🔄 AZZERA UNITS';
    }, 2000);
});