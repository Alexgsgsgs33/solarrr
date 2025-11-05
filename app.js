// Importamos la SDK de Firebase Authentication y Realtime Database
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// 🔹 Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBlpU0E12_8oDvg0DkW4C4WZVOmw12w0Ys",
    authDomain: "proyecto-solar-monitor.firebaseapp.com",
    databaseURL: "https://proyecto-solar-monitor-default-rtdb.firebaseio.com", 
    projectId: "proyecto-solar-monitor",
    storageBucket: "proyecto-solar-monitor.firebasestorage.app",
    messagingSenderId: "828542858199",
    appId: "1:828542858199:web:4ae367682517febe4b9192"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Elementos del DOM
const loginContainer = document.getElementById('login-container');
const mainContent = document.getElementById('main-content');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');

// Verificar estado de autenticación
auth.onAuthStateChanged((user) => {
    if (user) {
        // Usuario autenticado
        loginContainer.classList.add('hidden');
        mainContent.classList.remove('hidden');
        iniciarMonitoreo();
    } else {
        // Usuario no autenticado
        loginContainer.classList.remove('hidden');
        mainContent.classList.add('hidden');
    }
});

// Manejar login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginError.style.display = 'none';
    } catch (error) {
        loginError.textContent = 'Error: ' + error.message;
        loginError.style.display = 'block';
    }
});

// Manejar logout
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
});

// ---------------------------
// FUNCIONES DE MONITOREO (igual que antes)
// ---------------------------
function iniciarMonitoreo() {
    // SECCIÓN ESTADO GENERAL
    const lecturaActualRef = ref(db, 'lectura_actual');
    onValue(lecturaActualRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            console.log("Esperando datos del ESP32...");
            return;
        }

        document.getElementById("voltaje").textContent = `${data.voltaje.toFixed(2)} V`;
        document.getElementById("corriente").textContent = `${data.corriente.toFixed(2)} A`;
        document.getElementById("potencia").textContent = `${data.potencia.toFixed(2)} W`;

        const modoEl = document.getElementById("modo");
        modoEl.textContent = data.modo;
        modoEl.className = "estado " + data.modo.toLowerCase();
        
        agregarDatoGrafica(data);
    });

    // SECCIÓN SESIONES DE CARGA
    const sesionesRef = ref(db, 'sesiones_carga');
    onValue(sesionesRef, (snapshot) => {
        const lista = document.getElementById("lista_sesiones");
        lista.innerHTML = "";
        let total = 0;
        
        const data = snapshot.val();
        if (data) {
            Object.values(data).forEach(s => {
                total += s.energia_consumida;
                const li = document.createElement("li");
                li.textContent = `📱 ${s.dispositivo_id}: ${s.energia_consumida} Wh (${s.hora_inicio} - ${s.hora_fin})`;
                lista.appendChild(li);
            });
        }
        document.getElementById("total_energia").textContent = total.toFixed(2);
    });

    // SECCIÓN EVENTOS Y ALERTAS
    const eventosRef = ref(db, 'eventos');
    onValue(eventosRef, (snapshot) => {
        const lista = document.getElementById("lista_eventos");
        lista.innerHTML = "";

        const data = snapshot.val();
        if (data) {
            Object.values(data).forEach(e => {
                const li = document.createElement("li");
                li.textContent = `⚠️ ${e.tipo}: ${e.descripcion} (${e.fecha})`;
                if (e.nivel === "Crítico") li.classList.add("critico");
                lista.appendChild(li);
            });
        }
    });

    // GRÁFICA DE POTENCIA
    const ctx = document.getElementById("graficaPotencia").getContext("2d");
    const grafica = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Potencia (W)",
                    data: [],
                    borderColor: "rgb(30, 58, 138)", // Azul rey
                    backgroundColor: "rgba(30, 58, 138, 0.1)",
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            scales: { 
                x: { 
                    title: { 
                        display: true, 
                        text: "Tiempo" 
                    } 
                },
                y: {
                    title: {
                        display: true,
                        text: "Potencia (W)"
                    }
                }
            }
        }
    });

    // Función para agregar datos a la gráfica
    function agregarDatoGrafica(data) {
        const fecha = new Date(data.fecha);
        const hora = fecha.getHours().toString().padStart(2, '0');
        const min = fecha.getMinutes().toString().padStart(2, '0');
        const seg = fecha.getSeconds().toString().padStart(2, '0');
        const etiquetaTiempo = `${hora}:${min}:${seg}`;

        grafica.data.labels.push(etiquetaTiempo); 
        grafica.data.datasets[0].data.push(data.potencia);

        const maxPuntos = 20;
        if (grafica.data.labels.length > maxPuntos) {
            grafica.data.labels.shift();
            grafica.data.datasets[0].data.shift();
        }
        grafica.update();
    }
}
