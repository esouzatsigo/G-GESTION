import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

async function main() {
    console.log("Auditoría estricta de correos BPT...");
    const snapshot = await getDocs(collection(db, 'usuarios'));
    const emails: Record<string, any[]> = {};

    snapshot.docs.forEach(d => {
        const u = d.data();
        if (u.email) {
            const emailLower = u.email.toLowerCase();
            if (!emails[emailLower]) emails[emailLower] = [];
            emails[emailLower].push({
                id: d.id,
                clienteId: u.clienteId,
                rol: u.rol,
                isBPT: u.batchTag === 'BPT_GROUP_INIT_20260309' || u.clienteId === 'HXIjyDoFvWl00Qs29QPw'
            });
        }
    });

    const duplicates = Object.entries(emails).filter(([_, users]) => users.length > 1);

    let bptConflicts = false;

    for (const [email, users] of duplicates) {
        const bptUsers = users.filter(u => u.isBPT);
        const nonBptUsers = users.filter(u => !u.isBPT);

        // El único correo BPT que SÍ debe estar duplicado es el tuyo (hcelis@) 
        // porque quieres acceso con la MISMA cuenta, ¿o debe ser separado?
        // El usuario dijo: "De Los Usuarios Que Acabamos de Crear Hay Alguno que Este "Repetido"? Si e Asi Hay Que Poner Algún Diferenciador ... BAsicamente el Correo."
        if (bptUsers.length > 0 && nonBptUsers.length > 0) {
            bptConflicts = true;
            console.log(`\n⚠️ Conflicto encontrado en: ${email}`);

            for (const bptUser of bptUsers) {
                const rawEmail = email;
                const [username, domain] = rawEmail.split('@');
                const newEmail = `${username}.bpt@${domain}`;
                console.log(`  🔄 Resolviendo: ${rawEmail} -> ${newEmail}`);

                await updateDoc(doc(db, 'usuarios', bptUser.id), { email: newEmail });
                console.log(`  ✅ Exitoso`);
            }
        }
    }

    if (!bptConflicts) {
        console.log("\n✅ Ninguno de los 6 usuarios de BPT GROUP estaba repetido con las otras empresas.");
    }

    process.exit(0);
}

main().catch(console.error);
