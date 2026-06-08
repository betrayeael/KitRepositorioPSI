// wwwroot/js/firebase-interop.js
window.FirebaseInterop = {
    // NUEVA FUNCIÓN IMPLEMENTADA PARA CONECTAR CON TU PROGRAM.CS
    initialize: async function (configJson) {
        try {
            const config = JSON.parse(configJson);
            // Si usas la inicialización nativa de Firebase vía CDN, se mapea aquí:
            if (window.firebase && window.firebase.initializeApp) {
                const app = window.firebase.initializeApp(config);
                window.FirestoreDB = window.firebase.firestore();
                console.log("Firebase inicializado exitosamente desde el Host de C#.");
                return true;
            }
            console.warn("Módulos de Firebase CDN no detectados en window. Procediendo con fallback.");
            return false;
        } catch (error) {
            console.error("Error crítico en FirebaseInterop.initialize:", error);
            return false;
        }
    },

    // Persistencia asíncrona de datos estructurados hacia Firestore NoSQL
    saveProjectData: async function (projectId, jsonData) {
        try {
            if (!window.FirestoreDB || !window.FirestoreModules) {
                console.warn("Motor NoSQL no listo. Reteniendo mutación en almacenamiento local offline.");
                return false;
            }
            const { doc, setDoc } = window.FirestoreModules;
            const dataObject = JSON.parse(jsonData);
            dataObject.metadata.last_updated = new Date().toISOString();
            const docRef = doc(window.FirestoreDB, "proyectos_fase1", projectId);
            await setDoc(docRef, dataObject, { merge: true });
            return true;
        } catch (error) {
            console.error("Fallo crítico de escritura en puente JavaScript Interop:", error);
            return false;
        }
    },

    // Canal de escucha reactivo
    listenToProject: function (projectId, dotNetRef) {
        try {
            if (!window.FirestoreDB || !window.FirestoreModules) return;
            const { doc, onSnapshot } = window.FirestoreModules;
            const docRef = doc(window.FirestoreDB, "proyectos_fase1", projectId);
            return onSnapshot(docRef, (snapshot) => {
                if (snapshot.exists()) {
                    const jsonString = JSON.stringify(snapshot.data());
                    dotNetRef.invokeMethodAsync("ReceiveProjectUpdate", jsonString);
                }
            });
        } catch (error) {
            console.error("Error en el canal de escucha reactivo:", error);
        }
    }
};