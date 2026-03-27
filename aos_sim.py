from fastapi import FastAPI
import uvicorn
import os

app = FastAPI()

@app.get("/")
async def home():
    return {"message": "AoS Simulator funziona!"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)