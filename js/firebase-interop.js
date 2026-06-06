// wwwroot/js/firebase-interop.js

window.FirebaseInterop = {
    // Persistencia asíncrona de datos estructurados hacia Firestore NoSQL
    saveProjectData: async function (projectId, jsonData) {
        try {
            if (!window.FirestoreDB || !window.FirestoreModules) {
                console.warn("Motor NoSQL no listo. Reteniendo mutación en almacenamiento local offline.");
                return false;
            }

            const { doc, setDoc } = window.FirestoreModules;
            const dataObject = JSON.parse(jsonData);

            // Marcaje estricto de tiempo ISO en el cliente para auditoría de sincronización
            dataObject.metadata.last_updated = new Date().toISOString();

            // Referencia al documento único bajo la colección raíz de la Fase I
            const docRef = doc(window.FirestoreDB, "proyectos_fase1", projectId);

            // Operación Atómica con mezcla selectiva (merge) para proteger la integridad estructural
            await setDoc(docRef, dataObject, { merge: true });
            return true;
        } catch (error) {
            console.error("Fallo crítico de escritura en puente JavaScript Interop:", error);
            return false;
        }
    },

    // Canal de escucha reactivo (WebSockets / Long Polling) acoplado al State Container de C#
    listenToProject: function (projectId, dotNetRef) {
        try {
            if (!window.FirestoreDB || !window.FirestoreModules) {
                console.error("Imposible enlazar canal reactivo: SDK de Firebase ausente.");
                return;
            }

            const { doc, onSnapshot } = window.FirestoreModules;
            const docRef = doc(window.FirestoreDB, "proyectos_fase1", projectId);

            // Suscripción en caliente al flujo de mutaciones del documento
            onSnapshot(docRef, (snapshot) => {
                // 'hasPendingWrites' es TRUE si el cambio se originó localmente y no ha tocado el servidor.
                // Filtrar esto evita bucles infinitos de reverberación entre C# y la memoria local.
                if (snapshot.exists() && !snapshot.metadata.hasPendingWrites) {
                    const serverData = snapshot.data();
                    const jsonString = JSON.stringify(serverData);

                    // Inyección asíncrona directa hacia la instancia en memoria de Blazor
                    dotNetRef.invokeMethodAsync('OnProjectUpdatedFromFirestore', jsonString);
                }
            }, (error) => {
                console.error("Desconexión o fallo de privilegios en el Listener de Firestore:", error);
            });
        } catch (error) {
            console.error("Error de inicialización en el observador topológico:", error);
        }
    }
};