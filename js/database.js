// --- database.js ---
const DB_NAME = 'SonarAudioDB';
const STORE_NAME = 'audio_files';
const DB_VERSION = 1;

// DATOS DE PRUEBA (MOCK DATA)
const DATOS_SEMILLA = {
    artistas: [
        { id: 1, nombre: "Kaze", profilePic: "https://i.pravatar.cc/150?u=kaze", bannerPic: "https://picsum.photos/seed/kaze/800/300" },
        { id: 2, nombre: "Neon Vibes", profilePic: "https://i.pravatar.cc/150?u=neon", bannerPic: "https://picsum.photos/seed/neon/800/300" },
        { id: 3, nombre: "Los Sónicos", profilePic: "https://i.pravatar.cc/150?u=sonic", bannerPic: "https://picsum.photos/seed/sonic/800/300" }
    ],
    discos: [
        { id: 101, titulo: "Arcane Signet", artistaId: 1, genero: "Hip Hop", cover: "https://picsum.photos/seed/arcane/300/300" },
        { id: 102, titulo: "Midnight City", artistaId: 2, genero: "Synthwave", cover: "https://picsum.photos/seed/midnight/300/300" },
        { id: 103, titulo: "Ruido Blanco", artistaId: 3, genero: "Rock", cover: "https://picsum.photos/seed/ruido/300/300" }
    ],
    canciones: [
        { id: 1001, titulo: "Sacando la mano", artistaId: 1, discoId: 101, urlExterna: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
        { id: 1002, titulo: "Vienen para levantarte", artistaId: 1, discoId: 101, urlExterna: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
        { id: 1003, titulo: "Luces de Neón", artistaId: 2, discoId: 102, urlExterna: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
        { id: 1004, titulo: "Distorsión", artistaId: 3, discoId: 103, urlExterna: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
    ],
    posts: [
        { id: 5001, artistaId: 1, texto: "¡Nuevo lanzamiento disponible! Escuchen 'Arcane Signet' ahora.", fecha: new Date().toISOString() },
        { id: 5002, artistaId: 2, texto: "¿Qué opinan de la nueva estética visual?", fecha: new Date().toISOString() }
    ]
};

function inicializarBaseDeDatos() {
    if (!localStorage.getItem('sonar_data')) {
        const db = {
            artistas: DATOS_SEMILLA.artistas,
            discos: DATOS_SEMILLA.discos,
            canciones: DATOS_SEMILLA.canciones,
            posts: DATOS_SEMILLA.posts,
            nextIds: { artista: 4, disco: 104, cancion: 1005, post: 5003 }
        };
        localStorage.setItem('sonar_data', JSON.stringify(db));
    }
}

function abrirAudioDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

function obtenerDatos() {
    return JSON.parse(localStorage.getItem('sonar_data'));
}

function guardarDatos(db) {
    localStorage.setItem('sonar_data', JSON.stringify(db));
}

async function guardarAudio(cancionId, audioBlob) {
    const db = await abrirAudioDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(audioBlob, cancionId);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

async function obtenerAudio(cancionId) {
    const db = await abrirAudioDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(cancionId);
        request.onsuccess = (event) => {
            if (event.target.result) resolve(event.target.result);
            else resolve(null); // Si no hay audio local, devuelve null
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

async function agregarLanzamiento(lanzamiento) {
    const db = obtenerDatos();
    
    // Buscar o Crear Artista
    let artista = db.artistas.find(a => a.nombre.toLowerCase() === lanzamiento.artistaNombre.toLowerCase());
    if (!artista) {
        artista = {
            id: db.nextIds.artista++,
            nombre: lanzamiento.artistaNombre,
            profilePic: lanzamiento.profilePic,
            bannerPic: lanzamiento.bannerPic
        };
        db.artistas.push(artista);
    }

    // Crear Disco
    const disco = {
        id: db.nextIds.disco++,
        titulo: lanzamiento.titulo,
        artistaId: artista.id,
        genero: lanzamiento.genero,
        cover: lanzamiento.cover
    };
    db.discos.push(disco);

    // Guardar Canciones
    for (let i = 0; i < lanzamiento.canciones.length; i++) {
        const item = lanzamiento.canciones[i];
        const cancionId = db.nextIds.cancion++;
        const cancion = {
            id: cancionId,
            titulo: item.titulo,
            artistaId: artista.id,
            discoId: disco.id
        };
        db.canciones.push(cancion);
        try {
            await guardarAudio(cancionId, item.archivo);
        } catch (error) {
            console.error("Error guardando audio", error);
        }
    }
    
    // Crear Post Automático
    const nuevoPost = {
        id: db.nextIds.post++,
        artistaId: artista.id,
        texto: `Acabo de lanzar mi nuevo proyecto "${disco.titulo}". ¡Escúchenlo ahora en SONAR!`,
        fecha: new Date().toISOString()
    };
    db.posts.unshift(nuevoPost);

    guardarDatos(db);
    return true;
}

// --- HELPER DE USUARIO ACTUAL ---
// Esto simula la sesión iniciada. Usamos el ID 999 que definimos en profile.js
function getUsuarioActual() {
    const db = obtenerDatos();
    const MY_ID = 999;
    let usuario = db.artistas.find(a => a.id === MY_ID);
    
    // Si no existe (primera vez en Index sin haber pasado por Profile), devolvemos un placeholder
    if (!usuario) {
        return {
            id: MY_ID,
            nombre: "Usuario Invitado",
            profilePic: "https://via.placeholder.com/150",
            esInvitado: true // Flag para saber que no es un perfil real aún
        };
    }
    return usuario;
}

// Función global para publicar
function publicarPost(texto) {
    const db = obtenerDatos();
    const usuario = getUsuarioActual();
    
    // Si el usuario no existe en la DB (es invitado), lo creamos al vuelo para que pueda postear
    if (usuario.esInvitado) {
        const nuevoArtista = {
            id: usuario.id,
            nombre: "Ricardito Mecha Piola", // Nombre por defecto si postea desde home
            profilePic: "https://via.placeholder.com/150",
            bannerPic: "https://via.placeholder.com/1200x400/333/333"
        };
        db.artistas.push(nuevoArtista);
        // Actualizamos la referencia local
        usuario.id = nuevoArtista.id;
    }

    const nuevoPost = {
        id: db.nextIds.post++,
        artistaId: usuario.id,
        texto: texto,
        fecha: new Date().toISOString()
    };
    
    db.posts.unshift(nuevoPost); // Al principio
    guardarDatos(db);
    return nuevoPost;
}

inicializarBaseDeDatos();