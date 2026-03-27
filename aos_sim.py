import random
from fastapi import FastAPI, Body
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import os

app = FastAPI()

# Monta la cartella static per CSS, JS, ecc.
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def home():
    with open("templates/index.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)

# Funzioni di calcolo
def calcola_danno(tipo_danno):
    tipo_danno = tipo_danno.upper().strip()
    if tipo_danno == "1": return 1
    if tipo_danno == "2": return 2
    if tipo_danno == "3": return 3
    if tipo_danno == "4": return 4
    if tipo_danno == "5": return 5
    if tipo_danno == "6": return 6
    if tipo_danno == "7": return 7
    if tipo_danno == "8": return 8
    if tipo_danno == "D3": return random.randint(1, 3)
    if tipo_danno == "D3+1": return random.randint(1, 3) + 1
    if tipo_danno == "D3+2": return random.randint(1, 3) + 2
    if tipo_danno == "D3+3": return random.randint(1, 3) + 3
    if tipo_danno == "D6": return random.randint(1, 6)
    if tipo_danno == "D6+1": return random.randint(1, 6) + 1
    if tipo_danno == "D6+2": return random.randint(1, 6) + 2
    if tipo_danno == "D6+3": return random.randint(1, 6) + 3
    try:
        return int(tipo_danno)
    except:
        return 1

def simula_profilo(attacchi, colpire_su, tipo_critico, soglia_critico, ferire_su, rend, danno_input, save_su):
    tipo_critico = tipo_critico.upper().strip()
    successi_hit = 0
    critici_mortali = 0
    critici_2colpi = 0
    critici_autowound = 0
    
    for _ in range(attacchi):
        hit_roll = random.randint(1, 6)
        if hit_roll >= colpire_su:
            successi_hit += 1
            if hit_roll >= soglia_critico:
                if tipo_critico == "MORTALE":
                    critici_mortali += 1
                elif tipo_critico == "2 HIT":
                    critici_2colpi += 1
                elif tipo_critico == "AUTO-WOUND":
                    critici_autowound += 1
    
    hit_normali = successi_hit - critici_mortali - critici_2colpi - critici_autowound
    colpi_da_ferire_totali = hit_normali + critici_2colpi
    
    successi_wound = 0
    for _ in range(colpi_da_ferire_totali):
        if random.randint(1, 6) >= ferire_su:
            successi_wound += 1
    
    ferite_totali = successi_wound + critici_autowound
    save_successi = 0
    save_necessario = save_su + abs(rend)
    
    if save_necessario <= 6 and ferite_totali > 0:
        for _ in range(ferite_totali):
            if random.randint(1, 6) >= save_necessario:
                save_successi += 1
    
    ferite_non_salvate = ferite_totali - save_successi
    danni = 0
    for _ in range(critici_mortali):
        danni += calcola_danno(danno_input)
    for _ in range(ferite_non_salvate):
        danni += calcola_danno(danno_input)
    return danni

@app.post("/api/simula")
async def simula(data: dict = Body(...)):
    save_su = data.get("save", 7)
    ward_input = data.get("ward", "NO")
    
    ward_presente = ward_input != "NO"
    ward_su = int(str(ward_input)[0]) if ward_presente else 7
    
    profili = []
    for p in range(1, 5):
        valore_critico = data.get(f"critico_p{p}", "").upper().strip()
        if valore_critico == "MORTALE":
            valore_critico = "MORTALE"
        elif valore_critico == "AUTO-WOUND":
            valore_critico = "AUTO-WOUND"
        elif valore_critico == "2 HIT":
            valore_critico = "2 HIT"
        else:
            valore_critico = ""
        
        profili.append({
            "attacchi": data.get(f"attacchi_p{p}", 0),
            "colpire": data.get(f"colpire_p{p}", 7),
            "critico": valore_critico,
            "soglia_critico": data.get(f"soglia_critico_p{p}", 6),
            "ferire": data.get(f"ferire_p{p}", 7),
            "rend": data.get(f"rend_p{p}", 0),
            "danno": data.get(f"danno_p{p}", "1")
        })
    
    risultati = []
    for _ in range(2000):
        danni_totali = 0
        for p in profili:
            if p["attacchi"] > 0:
                danni_totali += simula_profilo(
                    p["attacchi"], p["colpire"], p["critico"],
                    p["soglia_critico"], p["ferire"], p["rend"],
                    p["danno"], save_su
                )
        if ward_presente and danni_totali > 0:
            for _ in range(danni_totali):
                if random.randint(1, 6) >= ward_su:
                    danni_totali -= 1
        risultati.append(danni_totali)
    
    media = sum(risultati) / len(risultati)
    distribuzione = {}
    for d in risultati:
        distribuzione[d] = distribuzione.get(d, 0) + 1
    
    return {
        "statistiche": {
            "media": round(media, 2),
            "massimo": max(risultati),
            "minimo": min(risultati)
        },
        "distribuzione": distribuzione
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)