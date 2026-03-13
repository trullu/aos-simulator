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
        for (let i = 0; i <= 50; i++) {
            labels.push(i.toString());
            data.push(distribuzione[i] ? (distribuzione[i] / 2000 * 100) : 0);
        }
        
        if (chartInstance) chartInstance.destroy();
        
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Percentuale (%)',
                    data: data,
                    backgroundColor: 'rgba(0, 102, 204, 0.7)',
                    borderColor: 'rgba(0, 102, 204, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Percentuale (%)' } },
                    x: { title: { display: true, text: 'Danni inflitti' } }
                }
            }
        });
    }
});