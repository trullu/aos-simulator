document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('simulation-form');
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    let chartInstance = null;
    let showAverageLine = true;  // Controllo per la linea della media

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
            const response = await fetch('/simula', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            updateResults(result, data.ferite_nemiche);
            
        } catch (error) {
            console.error('Errore:', error);
            alert('Errore durante la simulazione. Assicurati che il server sia in esecuzione.');
        } finally {
            loadingDiv.style.display = 'none';
        }
    });
    
    function updateResults(result, feriteNemiche) {
        resultsDiv.style.display = 'block';
        
        const media = result.statistiche.media;
        const massimo = result.statistiche.massimo;
        const minimo = result.statistiche.minimo;
        
        document.getElementById('media-danni').textContent = media;
        document.getElementById('max-danni').textContent = massimo;
        document.getElementById('min-danni').textContent = minimo;
        
        const distribuzione = result.distribuzione;
        let eliminazioni = 0;
        for (const [danno, frequenza] of Object.entries(distribuzione)) {
            if (parseInt(danno) >= feriteNemiche) eliminazioni += frequenza;
        }
        const percEliminazione = (eliminazioni / 2000 * 100).toFixed(2);
        document.getElementById('perc-eliminazione').textContent = percEliminazione + '%';
        document.getElementById('conteggio-eliminazione').textContent = `(${eliminazioni}/2000)`;
        
        // Passa la media al grafico per la linea
        createChart(distribuzione, media);
        
        // Aggiungi il pulsante di download dopo che il grafico è visibile
        addDownloadButton();
    }
    
    function createChart(distribuzione, mediaDanni = null) {
        const ctx = document.getElementById('danniChart').getContext('2d');
        
        // Trova il valore massimo di danno che ha una frequenza > 0
        const labels = [];
        const data = [];
        let maxDanno = 0;
        
        // Estrai tutte le chiavi (danni) dalla distribuzione e trova il massimo
        const danni = Object.keys(distribuzione).map(Number);
        if (danni.length > 0) {
            maxDanno = Math.max(...danni);
        }
        
        // Crea l'array di etichette da 0 a maxDanno
        for (let i = 0; i <= maxDanno; i++) {
            labels.push(i.toString());
            const frequenza = distribuzione[i] || 0;
            const percentuale = (frequenza / 2000 * 100);
            data.push(percentuale);
        }
        
        // Distruggi grafico esistente se presente
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        // Prepara i dataset - INIZIALMENTE SOLO LE BARRE
        const datasets = [{
            label: 'Percentuale (%)',
            data: data,
            backgroundColor: 'rgba(191, 155, 92, 0.7)',  // Oro Warhammer
            borderColor: 'rgba(191, 155, 92, 1)',
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.9,
            categoryPercentage: 0.8
        }];
        
        // Aggiungi la linea della media SEPARATAMENTE se richiesta e se abbiamo il valore
        if (showAverageLine && mediaDanni !== null && mediaDanni > 0) {
            // Crea un array con lo stesso numero di elementi di data, tutti uguali alla media
            const mediaData = Array(data.length).fill(mediaDanni);
            datasets.push({
                label: `Media: ${mediaDanni.toFixed(2)} danni`,
                data: mediaData,
                type: 'line',
                borderColor: 'rgba(220, 53, 69, 0.8)',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 0,
                tension: 0.1,
                order: 2  // Assicura che la linea sia sopra le barre
            });
        }
        
        // Crea nuovo grafico
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return `Danno: ${context[0].label}`;
                            },
                            label: function(context) {
                                // Se è la linea della media, mostra solo quel valore
                                if (context.dataset.type === 'line') {
                                    return `${context.dataset.label}: ${context.raw.toFixed(2)} danni`;
                                }
                                // Per le barre, mostra percentuale e frequenza
                                const danno = parseInt(context.label);
                                const frequenza = distribuzione[danno] || 0;
                                return [
                                    `Percentuale: ${context.raw.toFixed(2)}%`,
                                    `Frequenza: ${frequenza} volte`,
                                    `(su 2000 simulazioni)`
                                ];
                            },
                            footer: function(tooltipItems) {
                                // Solo per le barre, aggiungi un'info extra
                                const item = tooltipItems[0];
                                if (item.dataset.type !== 'line') {
                                    const danno = parseInt(item.label);
                                    const frequenza = distribuzione[danno] || 0;
                                    if (frequenza > 0) {
                                        return `⬇️ ${frequenza} volte su 2000`;
                                    }
                                }
                                return '';
                            }
                        },
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#bf9b5c',
                        bodyColor: '#e0e0e0',
                        borderColor: '#bf9b5c',
                        borderWidth: 1
                    },
                    legend: {
                        labels: {
                            color: '#e0e0e0',
                            font: {
                                size: 12
                            }
                        },
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Percentuale (%)',
                            color: '#bf9b5c',
                            font: {
                                weight: 'bold',
                                size: 14
                            }
                        },
                        grid: {
                            color: 'rgba(191, 155, 92, 0.2)'
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
                            text: 'Danni inflitti',
                            color: '#bf9b5c',
                            font: {
                                weight: 'bold',
                                size: 14
                            }
                        },
                        grid: {
                            color: 'rgba(191, 155, 92, 0.2)'
                        },
                        ticks: {
                            color: '#e0e0e0',
                            stepSize: 2,
                            autoSkip: true,
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                }
            }
        });
    }
    
    // === PULSANTE PER SCARICARE IL GRAFICO ===
    function addDownloadButton() {
        // Cerca la card che contiene il grafico
        const chartCard = document.querySelector('.card:has(#danniChart)');
        if (chartCard && !document.getElementById('download-chart')) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'download-btn-container text-end mt-2';
            buttonContainer.innerHTML = `
                <button id="download-chart" class="btn btn-sm btn-outline-gold">
                    📸 Scarica grafico come PNG
                </button>
            `;
            chartCard.querySelector('.card-body').appendChild(buttonContainer);
            
            // Aggiungi l'evento al pulsante
            document.getElementById('download-chart').addEventListener('click', function() {
                const canvas = document.getElementById('danniChart');
                const link = document.createElement('a');
                link.download = 'aos_damage_distribution.png';
                link.href = canvas.toDataURL();
                link.click();
            });
        }
    }
});

// === PULSANTE AZZERA UNITS ===
document.getElementById('reset-units').addEventListener('click', function() {
    // Azzera UNITS per tutti e 4 i profili
    for (let p = 1; p <= 4; p++) {
        const unitsField = document.getElementById(`units_${p}`);
        if (unitsField) {
            unitsField.value = 0;
        }
    }
    
    // Feedback visivo
    this.classList.add('btn-success');
    this.classList.remove('btn-secondary');
    this.innerHTML = '✅ UNITS AZZERATE';
    
    // Dopo 2 secondi, ripristina il pulsante originale
    setTimeout(() => {
        this.classList.remove('btn-success');
        this.classList.add('btn-secondary');
        this.innerHTML = '🔄 AZZERA UNITS';
    }, 2000);
});