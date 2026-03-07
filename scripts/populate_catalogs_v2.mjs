
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "project-198928689880.firebaseapp.com",
    projectId: "project-198928689880",
    storageBucket: "project-198928689880.firebasestorage.app",
    messagingSenderId: "198928689880",
    appId: "1:198928689880:web:7f90dcd33e710fcc7505ad",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function populateV2() {
    console.log("Iniciando población de catálogos V2...");

    // 1. CLIENTE: GRUPO BPT
    const clienteData = {
        nombre: "BPT",
        razonSocial: "GRUPO BOSPATEX SAPI DE CV"
    };
    const clienteQuery = query(collection(db, "clientes"), where("nombre", "==", "BPT"));
    const clienteSnapshot = await getDocs(clienteQuery);
    let clienteId = "";
    if (clienteSnapshot.empty) {
        const docRef = await addDoc(collection(db, "clientes"), clienteData);
        clienteId = docRef.id;
        console.log("Cliente BPT creado:", clienteId);
    } else {
        clienteId = clienteSnapshot.docs[0].id;
        console.log("Cliente BPT ya existe:", clienteId);
    }

    // 2. SUCURSALES
    const sucursales = [
        {
            id: "BA",
            franquicia: "Boston's",
            nombre: "Altabrisa",
            direccion: "Av. 7 451, Fraccionamiento Altabrisa, 97130 Mérida, YUC",
            coordenadas: { lat: 21.018751250251654, lng: -89.58276096432154 },
            clienteId: clienteId
        },
        {
            id: "BM",
            franquicia: "Boston's",
            nombre: "Montejo",
            direccion: "Gran Plaza Montejo, Mérida",
            coordenadas: { lat: 21.028278889524636, lng: -89.62492593138924 },
            clienteId: clienteId
        }
    ];

    for (const s of sucursales) {
        const sRef = doc(db, "sucursales", s.id);
        await setDoc(sRef, s);
        console.log(`Sucursal ${s.id} (${s.nombre}) creada/actualizada.`);
    }

    // 3. USUARIOS
    const usuarios = [
        {
            id: "hcelis",
            nombre: "HCelis",
            email: "hhcelis@hgestion.com",
            rol: "Admin",
            clientId: clienteId,
            sucursalesPermitidas: ["TODAS"],
            password: "hhcelis"
        },
        {
            id: "Coord.IvanGo",
            nombre: "Coordinador BPT",
            email: "ivango@bpt.com",
            rol: "Coordinador",
            clientId: clienteId,
            sucursalesPermitidas: ["TODAS"],
            password: "12345678"
        },
        {
            id: "Gerente.BA",
            nombre: "GERENTE BA",
            email: "gerente.ba@bpt.com",
            rol: "Gerente",
            clientId: clienteId,
            sucursalesPermitidas: ["BA"],
            password: "12345678"
        },
        {
            id: "Supervisor.BA",
            nombre: "SUPERVISOR BA",
            email: "supervisor.ba@bpt.com",
            rol: "Supervisor",
            clientId: clienteId,
            sucursalesPermitidas: ["BA"],
            password: "12345678"
        },
        {
            id: "Tecnico.BA",
            nombre: "TECNICO BA",
            email: "tecnico.ba@bpt.com",
            rol: "Tecnico",
            clientId: clienteId,
            sucursalesPermitidas: ["BA"],
            coordinadorId: "Coord.IvanGo",
            supervisorId: "Supervisor.BA",
            password: "12345678"
        },
        {
            id: "TecExt.REF",
            nombre: "TEC. EXT. REFRIGERACION",
            email: "tecext.ref@externo.com",
            rol: "TecnicoExterno",
            clientId: clienteId,
            sucursalesPermitidas: ["TODAS"],
            coordinadorId: "Coord.IvanGo",
            password: "12345678"
        }
    ];

    for (const u of usuarios) {
        const uRef = doc(db, "usuarios", u.id);
        await setDoc(uRef, u);
        console.log(`Usuario ${u.id} creado/actualizado.`);
    }

    // 4. EQUIPOS
    const equipos = [
        { id: "1", sucursalId: "BA", familia: "Refrigeracion", nombre: "Refrigerador de Masas 1" },
        { id: "2", sucursalId: "BA", familia: "Refrigeracion", nombre: "Refrigerador de Postres 1" },
        { id: "3", sucursalId: "BM", familia: "Refrigeracion", nombre: "Refrigerador de Masas 1" },
        { id: "4", sucursalId: "BM", familia: "Refrigeracion", nombre: "Refrigerador de Postres 1" }
    ];

    for (const e of equipos) {
        const eRef = doc(db, "equipos", e.id);
        await setDoc(eRef, { ...e, clienteId: clienteId });
        console.log(`Equipo ${e.id} (${e.nombre}) creado/actualizada en sucursal ${e.sucursalId}.`);
    }

    console.log("Población V2 completada.");
}

populateV2().catch(console.error);
