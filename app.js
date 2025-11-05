// Importamos la SDK de Realtime Database (RTDB)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// 🔹 Tus credenciales (las mismas de antes)
const firebaseConfig = {
    apiKey: "AIzaSyBlpU0E12_8oDvg0DkW4C4WZVOmw12w0Ys",
    authDomain: "proyecto-solar-monitor.firebaseapp.com",
    // Esta URL es la importante para RTDB
    databaseURL: "https://proyecto-solar-monitor-default-rtdb.firebaseio.com", 
    projectId: "proyecto-solar-monitor",
    storageBucket: "proyecto-solar-monitor.firebasestorage.app",
    messagingSenderId: "828542858199",
    appId: "1:828542858199:web:4ae367682517febe4b9192"
  };
  
const app = initializeApp(firebaseConfig);
// Inicializamos Realtime Database
const db = getDatabase(app);

// ---------------------------
// SECCIÓN ESTADO GENERAL (Lógica de RTDB)
// ---------------------------
// Apuntamos a la ruta exacta donde el ESP32 escribe
const lecturaActualRef = ref(db, 'lectura_actual');

onValue(lecturaActualRef, (snapshot) => {
  const data = snapshot.val(); // Obtenemos el objeto de datos
  if (!data) {
    console.log("Esperando datos del ESP32...");
    return;
  }

  // Actualizamos las 4 tarjetas
  document.getElementById("voltaje").textContent = `${data.voltaje.toFixed(2)} V`;
  document.getElementById("corriente").textContent = `${data.corriente.toFixed(2)} A`;
  document.getElementById("potencia").textContent = `${data.potencia.toFixed(2)} W`;

  const modoEl = document.getElementById("modo");
  modoEl.textContent = data.modo;
  
  // Asignamos la clase CSS (ej. 'cargando', 'descargando')
  modoEl.className = "estado " + data.modo.toLowerCase();
  
  // Actualizamos la gráfica
  agregarDatoGrafica(data);
});

// ---------------------------
// SECCIÓN SESIONES DE CARGA (Lógica de RTDB)
// ---------------------------
const sesionesRef = ref(db, 'sesiones_carga');

onValue(sesionesRef, (snapshot) => {
  const lista = document.getElementById("lista_sesiones");
  lista.innerHTML = "";
  let total = 0;
  
  const data = snapshot.val();
  if (data) {
    // RTDB devuelve un objeto, así que lo iteramos
    Object.values(data).forEach(s => {
      total += s.energia_consumida;
      const li = document.createElement("li");
      li.textContent = `📱 ${s.dispositivo_id}: ${s.energia_consumida} Wh (${s.hora_inicio} - ${s.hora_fin})`;
      lista.appendChild(li);
    });
  }
  document.getElementById("total_energia").textContent = total.toFixed(2);
});

// ---------------------------
// SECCIÓN EVENTOS Y ALERTAS (Lógica de RTDB)
// ---------------------------
const eventosRef = ref(db, 'eventos');

onValue(eventosRef, (snapshot) => {
  const lista = document.getElementById("lista_eventos");
  lista.innerHTML = "";

  const data = snapshot.val();
  if (data) {
    // Iteramos el objeto de eventos
    Object.values(data).forEach(e => {
      const li = document.createElement("li");
      li.textContent = `⚠️ ${e.tipo}: ${e.descripcion} (${e.fecha})`;
      if (e.nivel === "Crítico") li.classList.add("critico");
      lista.appendChild(li);
    });
  }
});

// ---------------------------
// GRÁFICA DE POTENCIA (Ajustada para Timestamp)
// ---------------------------
const ctx = document.getElementById("graficaPotencia").getContext("2d");
const grafica = new Chart(ctx, {
  type: "line",
  data: {
    labels: [], // eje X (tiempo)
    datasets: [
      {
        label: "Potencia (W)",
        data: [], // eje Y (potencia)
        borderColor: "rgb(75, 192, 192)",
        tension: 0.3,
        fill: false
      }
    ]
  },
  options: {
    responsive: true,
    scales: { x: { title: { display: true, text: "Tiempo" } } }
  }
});

// Función modificada: convierte el timestamp del ESP32 a hora legible
function agregarDatoGrafica(data) {
  // El ESP32 envía data.fecha como un número (timestamp)
  const fecha = new Date(data.fecha);
  const hora = fecha.getHours().toString().padStart(2, '0');
  const min = fecha.getMinutes().toString().padStart(2, '0');
  const seg = fecha.getSeconds().toString().padStart(2, '0');
  const etiquetaTiempo = `${hora}:${min}:${seg}`;

  grafica.data.labels.push(etiquetaTiempo); 
  grafica.data.datasets[0].data.push(data.potencia);

  // Limita los puntos de datos en la gráfica (ej. últimos 20)
  const maxPuntos = 20;
  if (grafica.data.labels.length > maxPuntos) {
    grafica.data.labels.shift();
    grafica.data.datasets[0].data.shift();
  }
  grafica.update();
}