import network
import time
import json
import math
from ulab import scipy
from ulab import numpy as np
from machine import Pin, ADC, Timer, I2C
from umqtt.simple import MQTTClient

class NetworkManager:
    """Gestisce la trasmissione dati MQTT e la connettività Wi-Fi."""
    def __init__(self, ssid, password, broker_ip, topic_pub):
        self.ssid = ssid
        self.password = password
        self.broker_ip = broker_ip
        self.topic_pub = topic_pub
        self.station = network.WLAN(network.STA_IF)
        self.client = None

    def connect_wifi(self):
        self.station.active(True)
        if self.station.isconnected():
            print("Già connesso al Wi-Fi. IP:", self.station.ifconfig()[0])
            return True
        print("Connessione al WiFi...", end="")
        self.station.connect(self.ssid, self.password)
        attempt = 0
        while not self.station.isconnected() and attempt < 50:
            print(".", end="")
            time.sleep(0.2)
            attempt += 1
        if self.station.isconnected():
            print("\nCONNESSO! IP ESP32:", self.station.ifconfig()[0])
            return True
        print("\nConnessione Wi-Fi fallita.")
        return False

    def connect_mqtt(self):
        try:
            self.client = MQTTClient("esp32_manicotto", self.broker_ip)
            self.client.connect()
            print("MQTT Connesso con successo!")
            return True
        except Exception as e:
            print("Errore connessione MQTT:", e)
            self.client = None
            return False

    def send_packet(self, data_dict):
        """Invia un pacchetto dizionario convertito in stringa JSON."""
        if self.client is None:
            self.connect_mqtt()
        if self.client:
            try:
                self.client.publish(self.topic_pub, json.dumps(data_dict))
            except Exception:
                print("Errore durante l'invio, tentativo di ripristino connessione...")
                try:
                    self.client.connect()
                except Exception:
                    self.client = None


class MPU9250:
    """Driver per la lettura dell'accelerometro I2C."""
    def __init__(self, i2c, address=0x68):
        self.i2c = i2c
        self.addr = address
        try:
            self.i2c.writeto_mem(self.addr, 0x6B, b'\x00')
            time.sleep(0.1)
            self.initialized = True
        except Exception:
            print("Errore Hardware MPU9250.")
            self.initialized = False
        
    def read_accel(self):
        if not self.initialized:
            return 0.0, 0.0, 1.0
        try:
            data = self.i2c.readfrom_mem(self.addr, 0x3B, 6)
            ax = (data[0] << 8 | data[1])
            ay = (data[2] << 8 | data[3])
            az = (data[4] << 8 | data[5])
            if ax > 32767: ax -= 65536
            if ay > 32767: ay -= 65536
            if az > 32767: az -= 65536
            return ax / 16384.0, ay / 16384.0, az / 16384.0
        except Exception:
            return 0.0, 0.0, 1.0

    def get_angles(self):
        ax, ay, az = self.read_accel()
        if az == 0: az = 0.001
        pitch = math.atan2(ax, math.sqrt(ay * ay + az * az)) * 180.0 / math.pi
        roll = math.atan2(ay, math.sqrt(ax * ax + az * az)) * 180.0 / math.pi
        return pitch, roll


class SignalProcessor:
    """Filtri digitali integrati per l'EMG."""
    def __init__(self):
        self.sos_bp = np.array([
            [ 0.44186196,  0.88372392,  0.44186196,  1.0,         -0.63533604,  0.30193138],
            [ 1.0,           2.0,          1.0,          1.0,         -0.81643477,  0.45781302],
            [ 1.0,          -2.0,          1.0,          1.0,         -1.76127025,  0.78508892],
            [ 1.0,          -2.0,          1.0,          1.0,         -1.87955519,  0.90382348]
        ])
        self.stato_bp = np.zeros([4, 2])
        
        self.sos_nt = np.array([
            [ 0.99478144, -1.89209539,  0.99478144,  1.0, -1.89209539,  0.98956288]
        ])
        self.stato_nt = np.zeros([1, 2])

    def filtrare_emg(self, sample):
        try:
            out_bp, self.stato_bp = scipy.signal.sosfilt(self.sos_bp, [sample], zi=self.stato_bp)
            emg_finale, self.stato_nt = scipy.signal.sosfilt(self.sos_nt, [out_bp[0]], zi=self.stato_nt)
            return emg_finale[0]
        except Exception:
            return float(sample)


class PatientMonitor:
    """Core applicativo: gestisce le calibrazioni e l'invio euristico."""
    def __init__(self, ssid, password, broker_ip, topic_pub):
        # Hardware setup
        self.adc_emg = ADC(Pin(34, Pin.IN))
        self.adc_emg.atten(ADC.ATTN_11DB)  
        self.adc_fsr = ADC(Pin(32, Pin.IN))
        self.adc_fsr.atten(ADC.ATTN_11DB)  
        self.i2c = I2C(0, scl=Pin(22), sda=Pin(21), freq=400000)
        
        # Sottosistemi
        self.mpu = MPU9250(self.i2c)
        self.processor = SignalProcessor()
        self.net = NetworkManager(ssid, password, broker_ip, topic_pub)
        
        # Variabili ISR
        self.nuovo_campione = False
        self.grezzo_emg = 0
        
        # Variabili cliniche ed euristiche
        self.soglia_dinamica = 500.0
        self.mvc_valore = 1.0
        self.somma_emg_rettificato = 0.0
        self.conteggio_campioni = 0
        
        # Coordinate calibrazione spaziale
        self.coords = {"SX": (0.,0.), "DX": (0.,0.), "UP": (0.,0.), "DW": (0.,0.)}
        
        self.timer = Timer(0)

    def _timer_isr(self, t):
        self.grezzo_emg = self.adc_emg.read()
        self.nuovo_campione = True

    def calibra_orientamento(self, messaggio, durata=2):
        print("\n" + "-"*50)
        print(">>> FASE DI CALIBRAZIONE ORIENTAMENTO <<<")
        print(messaggio.upper())
        print("-"*50)
        for i in range(3, 0, -1):
            print(f"Inizio tra {i}...")
            time.sleep(1)
        print("Campionamento...")
        
        somma_pitch, somma_roll, conteggio = 0.0, 0.0, 0
        inizio = time.time()
        while time.time() - inizio < durata:
            p, r = self.mpu.get_angles()
            somma_pitch += p
            somma_roll += r
            conteggio += 1
            time.sleep(0.05)
        return (somma_pitch / conteggio, somma_roll / conteggio) if conteggio > 0 else (0.0, 0.0)

    def esegui_campionamento_emg(self):
        if self.nuovo_campione:
            self.nuovo_campione = False
            emg_puro = self.processor.filtrare_emg(float(self.grezzo_emg))
            self.somma_emg_rettificato += abs(emg_puro)
            self.conteggio_campioni += 1

    def start(self):
        self.net.connect_wifi()
        self.net.connect_mqtt()
        
        # Avvio acquisizione 1KHz
        self.timer.init(period=1, mode=Timer.PERIODIC, callback=self._timer_isr)
        
        # --- Calibrazioni Sequenziali ---
        self.coords["SX"] = self.calibra_orientamento("Tenere il braccio piegato a SINISTRA e FERMO")
        self.coords["DX"] = self.calibra_orientamento("Tenere il braccio piegato a DESTRA e FERMO")
        self.coords["UP"] = self.calibra_orientamento("Tenere il braccio piegato verso l'ALTO (SOPRA) e FERMO")
        self.coords["DW"] = self.calibra_orientamento("Tenere il braccio piegato verso il BASSO (SOTTO) e FERMO")
        
        # --- Baseline Riposo ---
        print("\n" + "="*50 + "\n >>> FASE 1/2: BASELINE RIPOSO <<< \n" + "="*50)
        time.sleep(1)
        valori_calib = []
        inizio = time.time()
        ultimo_ctrl = time.ticks_ms()
        
        while time.time() - inizio < 3:
            self.esegui_campionamento_emg()
            ora = time.ticks_ms()
            if time.ticks_diff(ora, ultimo_ctrl) >= 50:
                ultimo_ctrl = ora
                if self.conteggio_campioni > 0:
                    valori_calib.append(self.somma_emg_rettificato / self.conteggio_campioni)
                    self.somma_emg_rettificato, self.conteggio_campioni = 0.0, 0

        media_riposo = sum(valori_calib) / len(valori_calib) if valori_calib else 300.0
        self.soglia_dinamica = max(media_riposo * 2.5, 150.0)

        # --- Calibrazione MVC ---
        print("\n" + "="*50 + "\n >>> FASE 2/2: CALIBRAZIONE MASSIMA VOLONTARIA (MVC) <<< \n" + "="*50)
        time.sleep(1.5)
        inizio = time.time()
        ultimo_ctrl = time.ticks_ms()
        
        while time.time() - inizio < 4:
            self.esegui_campionamento_emg()
            ora = time.ticks_ms()
            if time.ticks_diff(ora, ultimo_ctrl) >= 50:
                ultimo_ctrl = ora
                if self.conteggio_campioni > 0:
                    inviluppo = self.somma_emg_rettificato / self.conteggio_campioni
                    if inviluppo > self.mvc_valore:
                        self.mvc_valore = inviluppo
                    self.somma_emg_rettificato, self.conteggio_campioni = 0.0, 0

        print(f"\n>>> CALIBRAZIONI TERMINATE! Riposo: {round(self.soglia_dinamica, 1)} | MVC: {round(self.mvc_valore, 1)}")
        time.sleep(1)
        
        # --- LOOP DI TRASMISSIONE ---
        ultimo_invio_mqtt = time.ticks_ms()
        
        try:
            while True:
                self.esegui_campionamento_emg()
                
                ora = time.ticks_ms()
                if time.ticks_diff(ora, ultimo_invio_mqtt) >= 50:
                    ultimo_invio_mqtt = ora
                    
                    if self.conteggio_campioni > 0:
                        emg_inviluppo = self.somma_emg_rettificato / self.conteggio_campioni
                        self.somma_emg_rettificato, self.conteggio_campioni = 0.0, 0
                    else:
                        emg_inviluppo = 0.0

                    # Calcoli medici ed euristici 
                    perc_emg_mvc = min((emg_inviluppo / self.mvc_valore) * 100.0, 100.0)
                    perc_fsr = (self.adc_fsr.read() / 4095.0) * 100.0
                    pitch_c, roll_c = self.mpu.get_angles()

                    # Calcolo distanze euclidee posizioni
                    d_sx = math.sqrt((pitch_c - self.coords["SX"][0])**2 + (roll_c - self.coords["SX"][1])**2)
                    d_dx = math.sqrt((pitch_c - self.coords["DX"][0])**2 + (roll_c - self.coords["DX"][1])**2)
                    d_up = math.sqrt((pitch_c - self.coords["UP"][0])**2 + (roll_c - self.coords["UP"][1])**2)
                    d_dw = math.sqrt((pitch_c - self.coords["DW"][0])**2 + (roll_c - self.coords["DW"][1])**2)
                    
                    min_dist = min(d_sx, d_dx, d_up, d_dw)
                    if min_dist == d_sx: movimento = "SINISTRA"
                    elif min_dist == d_dx: movimento = "DESTRA"
                    elif min_dist == d_up: movimento = "SOPRA"
                    else: movimento = "SOTTO"

                    efficiency = (perc_fsr / perc_emg_mvc) if perc_emg_mvc > 2.0 else 0.0

                    if emg_inviluppo < self.soglia_dinamica:
                        stato_clinico = "RIPOSO"
                    elif perc_fsr > 20.0 and perc_emg_mvc < 50.0:
                        stato_clinico = "BUONO: Reclutamento efficiente"
                    elif perc_fsr > 20.0 and perc_emg_mvc >= 50.0:
                        stato_clinico = "FATICA: Sforzo neurale asincrono"
                    else:
                        stato_clinico = "SPASMO: Attivazione senza forza"

                    # Costruzione payload JSON comprensivo di mvc_valore
                    dati_pacchetto = {
                        "emg": round(perc_emg_mvc, 2),
                        "fsr": round(perc_fsr, 2),
                        "pitch": round(pitch_c, 2),
                        "roll": round(roll_c, 2),
                        "efficiency": round(efficiency, 2),
                        "status_string": stato_clinico,
                        "position": movimento,
                        "mvc_valore": round(self.mvc_valore, 2) 
                    }
                    
                    self.net.send_packet(dati_pacchetto)
                    print(f"Pos: {movimento} | EMG: {round(perc_emg_mvc, 1)}% MVC | FSR: {round(perc_fsr, 1)}% | MVC Max: {round(self.mvc_valore, 1)}")
        finally:
            self.timer.deinit()
            print("\nHardware spento e rilasciato correttamente.")
