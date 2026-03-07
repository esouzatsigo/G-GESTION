
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where, setDoc, doc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
    storageBucket: "h-gestion-dev.firebasestorage.app",
    messagingSenderId: "198928689880",
    appId: "1:198928689880:web:7f90dcd33e710fcc7505ad",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function populate() {
    console.log("Iniciando población de catálogos...");

    // 1. Cliente: GRUPO BPT
    const clienteQuery = query(collection(db, "clientes"), where("nombre", "==", "GRUPO BPT"));
    const clienteSnapshot = await getDocs(clienteQuery);
    let clienteId = "";

    if (clienteSnapshot.empty) {
        const docRef = await addDoc(collection(db, "clientes"), {
            nombre: "GRUPO BPT",
            razonSocial: "Boston's Pizza & Tavern S.A. de C.V."
        });
        clienteId = docRef.id;
        console.log("Cliente GRUPO BPT creado con ID:", clienteId);
    } else {
        clienteId = clienteSnapshot.docs[0].id;
        console.log("Cliente GRUPO BPT ya existe:", clienteId);
    }

    // 2. Sucursal: Sucursal Demo BPT
    const sucursalQuery = query(collection(db, "sucursales"), where("nombre", "==", "Sucursal Demo BPT"));
    const sucursalSnapshot = await getDocs(sucursalQuery);
    let sucursalId = "";

    if (sucursalSnapshot.empty) {
        const docRef = await addDoc(collection(db, "sucursales"), {
            clienteId: clienteId,
            franquicia: "Boston's",
            nombre: "Sucursal Demo BPT",
            direccion: "Av. Principal 123, Ciudad de México",
            coordenadas: { lat: 19.4326, lng: -99.1332 }
        });
        sucursalId = docRef.id;
        console.log("Sucursal Demo BPT creada con ID:", sucursalId);
    } else {
        sucursalId = sucursalSnapshot.docs[0].id;
        console.log("Sucursal Demo BPT ya existe:", sucursalId);
    }

    // 3. Equipos: Varios Refrigeradores
    const equiposData = [
        { nombre: "Refrigerador de Masas 1", familia: "Refrigeracion" },
        { nombre: "Congelador de Proteínas A", familia: "Refrigeracion" },
        { nombre: "Refrigerador de Bebidas Frontal", familia: "Refrigeracion" },
        { nombre: "Cámara de Refrigeración Principal", familia: "Refrigeracion" },
        { nombre: "Mesa Fría de Preparación", familia: "Refrigeracion" }
    ];

    for (const eq of equiposData) {
        const eqQuery = query(collection(db, "equipos"),
            where("sucursalId", "==", sucursalId),
            where("nombre", "==", eq.nombre)
        );
        const eqSnapshot = await getDocs(eqQuery);
        if (eqSnapshot.empty) {
            await addDoc(collection(db, "equipos"), {
                clienteId: clienteId,
                sucursalId: sucursalId,
                familia: eq.familia,
                nombre: eq.nombre
            });
            console.log(`Equipo ${eq.nombre} creado.`);
        } else {
            console.log(`Equipo ${eq.nombre} ya existe.`);
        }
    }

    console.log("Población completada con éxito.");
}

populate().catch(console.error);
