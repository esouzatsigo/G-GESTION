import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

// Proyecto BPT_GROUP (h-gestion-dev)
const configDev = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
};

const appDev = initializeApp(configDev, "dev");
const dbDev = getFirestore(appDev);

async function listUsers() {
    console.log("== USUARIOS REALES EN BASE DE DATOS ==");
    const allUsers = await getDocs(collection(dbDev, 'usuarios'));
    const testBptUsers = allUsers.docs.filter(d => d.data().clienteNombre === 'TEST BPT' || d.data().clienteId === '3de6K2GeasZhN2GIQWXw');
    const bptGroupUsers = allUsers.docs.filter(d => d.data().clienteId === 'kWRmv16DNfMUlSF1Yqiv');
    
    console.log(`\nUsuarios de TEST BPT (${testBptUsers.length}):`);
    testBptUsers.forEach(d => console.log(`- ${d.data().email} (${d.data().rol})`));

    console.log(`\nUsuarios de BPT GROUP (${bptGroupUsers.length}):`);
    bptGroupUsers.forEach(d => console.log(`- ${d.data().email} (${d.data().rol})`));
    
    process.exit(0);
}

listUsers();
