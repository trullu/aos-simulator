import random
from fastapi import FastAPI, Body, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# Configurazione CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurazione template e file statici
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

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
    
    if tipo_danno == "D3":
        return random.randint(1, 3)
    if tipo_danno == "D3+1":
        return random.randint(1, 3) + 1
    if tipo_danno == "D3+2":
        return random.randint(1, 3) + 2
    if tipo_danno == "D3+3":
        return random.randint(1, 3) + 3
    
    if tipo_danno == "D6":
        return random.randint(1, 6)
    if tipo_danno == "D6+1":
        return random.randint(1, 6) + 1
    if tipo_danno == "D6+2":
        return random.randint(1, 6) + 2
    if tipo_danno == "D6+3":
        return random.randint(1, 6) + 3
    
    try:
        return int(tipo_danno)
    except:
        return 1

def simula_profilo(attacchi, colpire_su, tipo_critico, ferire_su, rend, danno_input, save_su):
    successi_hit = 0
    critici_mortali = 0
    critici_2colpi = 0
    critici_autowound = 0
    
    for _ in range(attacchi):
        hit_roll = random.randint(1, 6)
        if hit_roll >= colpire_su:
            successi_hit += 1
            
            if hit_roll == 6:
                if tipo_critico == "MORTALE":
                    critici_mortali += 1
                elif tipo_critico == "2 hit":
                    critici_2colpi += 1
                elif tipo_critico == "AUTO-WOUND":
                    critici_autowound += 1
    
    hit_normali = successi_hit - critici_mortali - critici_2colpi - critici_autowound
    colpi_da_ferire_totali = hit_normali + critici_2colpi
    
    successi_wound = 0
    for _ in range(colpi_da_ferire_totali):
        wound_roll = random.randint(1, 6)
        if wound_roll >= ferire_su:
            successi_wound += 1
    
    ferite_totali = successi_wound + critici_autowound
    save_successi = 0
    save_necessario = save_su + abs(rend)
    
    if save_necessario <= 6 and ferite_totali > 0:
        for _ in range(ferite_totali):
            save_roll = random.randint(1, 6)
            if save_roll >= save_necessario:
                save_successi += 1
    
    ferite_non_salvate = ferite_totali - save_successi
    danni = 0
    
    for _ in range(critici_mortali):
        danni += calcola_danno(danno_input)
    for _ in range(ferite_non_salvate):
        danni += calcola_danno(danno_input)
    
    return danni

# Route principale
@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# Endpoint API
@app.post("/simula")
async def simula(data: dict = Body(...)):
    save_su = data.get("save", 7)
    ward_input = data.get("ward", "NO")
    
    ward_presente = False
    ward_su = 7
    if ward_input != "NO":
        ward_presente = True
        try:
            ward_su = int(str(ward_input)[0])
        except:
            ward_su = 7
    
    profili = []
    for p in range(1, 5):
        profilo = {
            "attacchi": data.get(f"attacchi_p{p}", 0),
            "colpire": data.get(f"colpire_p{p}", 7),
            "critico": data.get(f"critico_p{p}", ""),
            "ferire": data.get(f"ferire_p{p}", 7),
            "rend": data.get(f"rend_p{p}", 0),
            "danno": data.get(f"danno_p{p}", "1")
        }
        profili.append(profilo)
    
    risultati = []
    for _ in range(2000):
        danni_totali = 0
        
        for p in profili:
            if p["attacchi"] > 0:
                danni_totali += simula_profilo(
                    p["attacchi"],
                    p["colpire"],
                    p["critico"],
                    p["ferire"],
                    p["rend"],
                    p["danno"],
                    save_su
                )
        
        if ward_presente and danni_totali > 0:
            ward_successi = 0
            for _ in range(danni_totali):
                ward_roll = random.randint(1, 6)
                if ward_roll >= ward_su:
                    ward_successi += 1
            danni_totali -= ward_successi
        
        risultati.append(danni_totali)
    
    media = sum(risultati) / len(risultati)
    massimo = max(risultati)
    minimo = min(risultati)
    
    distribuzione = {}
    for d in risultati:
        distribuzione[d] = distribuzione.get(d, 0) + 1
    
    response = {
        "risultati": risultati[:50],
        "statistiche": {
            "media": round(media, 2),
            "massimo": massimo,
            "minimo": minimo
        },
        "distribuzione": distribuzione
    }
    
    return response

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)