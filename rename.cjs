const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.{ts,tsx}');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content
        .replace(/rol === 'Admin'/g, "rol === 'Admin General'")
        .replace(/rol !== 'Admin'/g, "rol !== 'Admin General'")
        .replace(/user\?\.rol === 'Admin'/g, "user?.rol === 'Admin General'")
        .replace(/user\?\.rol !== 'Admin'/g, "user?.rol !== 'Admin General'")
        .replace(/rol: 'Admin'/g, "rol: 'Admin General'")
        .replace(/rol === "Admin"/g, "rol === 'Admin General'")
        .replace(/rol !== "Admin"/g, "rol !== 'Admin General'");

    if (content !== newContent) {
        fs.writeFileSync(file, newContent);
        console.log('Updated', file);
    }
});
