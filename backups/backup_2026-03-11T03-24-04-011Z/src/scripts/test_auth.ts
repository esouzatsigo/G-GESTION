import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
    storageBucket: "h-gestion-dev.firebasestorage.app",
    messagingSenderId: "198928689880",
    appId: "1:198928689880:web:7f90dcd33e710fcc7505ad",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testAuth() {
    const emails = [
        "Ger.Altabrisa@BP.com",
        "coord.bpt@t-sigo.com",
        "tecnico.altabrisa@hgestion.com",
        "esp.coccion@t-sigo.com"
    ];

    for (const email of emails) {
        try {
            await signInWithEmailAndPassword(auth, email, email);
            console.log(`[SUCCESS] ${email}`);
        } catch (e: any) {
            console.error(`[FAIL] ${email}: ${e.message}`);
            try {
                await signInWithEmailAndPassword(auth, email, "12345678");
                console.log(`[SUCCESS with 12345678] ${email}`);
            } catch (e2: any) {
                console.error(`[FAIL 12345678] ${email}: ${e2.message}`);
                try {
                    await signInWithEmailAndPassword(auth, email, "123456");
                    console.log(`[SUCCESS with 123456] ${email}`);
                } catch (e3) { }
            }
        }
    }
    process.exit(0);
}

testAuth();
