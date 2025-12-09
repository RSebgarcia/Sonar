// --- profile.js ---
document.addEventListener('DOMContentLoaded', () => {
    
    // UI Elements
    const myArtistName = document.getElementById('my-artist-name');
    const myAvatar = document.getElementById('my-avatar');
    const myBanner = document.getElementById('my-banner');
    const trackCount = document.getElementById('track-count');
    const myReleasesGrid = document.getElementById('my-releases-grid');
    
    // Modals
    const uploadBtn = document.getElementById('upload-btn');
    const uploadModal = document.getElementById('upload-modal');
    const closeModal = document.getElementById('close-modal');
    
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const editProfileModal = document.getElementById('edit-profile-modal');
    const closeEditModal = document.getElementById('close-edit-modal');
    
    // Forms
    const uploadForm = document.getElementById('upload-form');
    const editProfileForm = document.getElementById('edit-profile-form');

    // File Handling
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const songListEditor = document.getElementById('song-list-editor');
    let songFilesArray = [];

    // --- 1. GESTIÓN DEL USUARIO "ACTUAL" ---
    // En un app real, esto sería login. En el demo, simulamos ser el ID 999
    // o buscamos si ya creamos uno.
    const MY_USER_ID = 999; 
    let myArtistData = null;

    function cargarPerfilUsuario() {
        const { artistas, discos, canciones } = obtenerDatos();
        
        // Buscamos si ya existe "mi" artista
        myArtistData = artistas.find(a => a.id === MY_USER_ID);

        if (!myArtistData) {
            // Si no existe, creamos uno por defecto (Estado Inicial)
            myArtistData = {
                id: MY_USER_ID,
                nombre: "Usuario Nuevo",
                profilePic: "https://via.placeholder.com/150",
                bannerPic: "https://via.placeholder.com/1200x400/111/111"
            };
            // Lo guardamos silenciosamente para empezar
            // (En un caso real, forzaríamos un modal de 'Crear Perfil')
        }

        // Renderizar UI
        myArtistName.textContent = myArtistData.nombre;
        myAvatar.src = myArtistData.profilePic;
        myBanner.src = myArtistData.bannerPic || "https://via.placeholder.com/1200x400/333/333";
        
        // Calcular estadísticas
        const misCanciones = canciones.filter(c => c.artistaId === MY_USER_ID);
        trackCount.textContent = misCanciones.length;

        // Renderizar Mis Lanzamientos
        const misDiscos = discos.filter(d => d.artistaId === MY_USER_ID);
        renderMisLanzamientos(misDiscos);
    }

    function renderMisLanzamientos(discos) {
        myReleasesGrid.innerHTML = '';
        if (discos.length === 0) {
            myReleasesGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: #666; padding: 40px;">
                    <i class="fas fa-music" style="font-size: 40px; margin-bottom: 10px;"></i>
                    <p>No tienes lanzamientos. ¡Sube tu primera canción!</p>
                </div>`;
            return;
        }

        discos.forEach(disco => {
            const card = document.createElement('div');
            card.className = 'song-card';
            card.innerHTML = `
                <img src="${disco.cover}" alt="${disco.titulo}">
                <h4>${disco.titulo}</h4>
                <p>${disco.genero}</p>
            `;
            myReleasesGrid.appendChild(card);
        });
    }

    // --- 2. LÓGICA DE SUBIDA (UPLOAD) ---
    
    uploadBtn.addEventListener('click', () => {
        uploadForm.reset();
        songFilesArray = [];
        songListEditor.innerHTML = '';
        uploadModal.classList.add('visible');
    });
    
    closeModal.addEventListener('click', () => uploadModal.classList.remove('visible'));

    // Drag & Drop
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => e.preventDefault());
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', e => handleFiles(e.target.files));

    function handleFiles(files) {
        const newFiles = [...files].filter(file => file.type === 'audio/mpeg' || file.name.endsWith('.mp3'));
        songFilesArray = [...songFilesArray, ...newFiles];
        renderSongEditor();
    }

    function renderSongEditor() {
        if(songFilesArray.length === 0) {
            songListEditor.innerHTML = '';
            return;
        }
        songListEditor.innerHTML = '<label>Canciones detectadas:</label>';
        songFilesArray.forEach((file, index) => {
            const defaultTitle = file.name.replace(/\.[^/.]+$/, "");
            songListEditor.innerHTML += `
                <div class="song-editor-item">
                    <i class="fas fa-file-audio"></i>
                    <input type="text" class="song-title-input" value="${defaultTitle}">
                </div>`;
        });
    }

    // Submit Upload
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validaciones básicas
        if(songFilesArray.length === 0) { alert("Faltan canciones"); return; }
        const coverInput = document.getElementById('release-cover');
        if(!coverInput.files[0]) { alert("Falta portada"); return; }

        const btn = uploadForm.querySelector('button[type="submit"]');
        btn.textContent = "Subiendo..."; btn.disabled = true;

        try {
            // Leer Portada
            const coverBase64 = await readFileAsBase64(coverInput.files[0]);
            
            // Preparar objeto Artista (asegurarnos que exista en DB)
            const db = obtenerDatos();
            let artistaEnDB = db.artistas.find(a => a.id === MY_USER_ID);
            
            // Si es la primera vez que subimos, guardamos el artista en la DB real
            if (!artistaEnDB) {
                artistaEnDB = { ...myArtistData }; // Usar datos actuales
                db.artistas.push(artistaEnDB);
                guardarDatos(db);
            }

            // Preparar Canciones
            const titleInputs = document.querySelectorAll('.song-title-input');
            const cancionesData = [];
            titleInputs.forEach((input, index) => {
                cancionesData.push({
                    titulo: input.value,
                    archivo: songFilesArray[index]
                });
            });

            // Llamar a database.js
            const nuevoLanzamiento = {
                artistaNombre: myArtistData.nombre, // Solo referencia
                // Forzamos que use MI ID
                forceArtistId: MY_USER_ID, 
                titulo: document.getElementById('release-title').value,
                genero: document.getElementById('release-genre').value,
                cover: coverBase64,
                canciones: cancionesData
            };

            // NOTA: Debemos modificar database.js ligeramente para aceptar "forceArtistId"
            // O manejamos la lógica aquí. Para simplificar, asumimos que agregarLanzamiento
            // busca por nombre. Vamos a actualizar myArtistData.nombre en el form si cambió.
            
            await agregarLanzamiento(nuevoLanzamiento);
            
            uploadModal.classList.remove('visible');
            cargarPerfilUsuario(); // Recargar grilla
            alert("¡Lanzamiento publicado!");

        } catch (err) {
            console.error(err);
            alert("Error al subir.");
        } finally {
            btn.textContent = "Publicar Ahora"; btn.disabled = false;
        }
    });

    // --- 3. EDITAR PERFIL ---
    
    editProfileBtn.addEventListener('click', () => {
        document.getElementById('edit-name-input').value = myArtistData.nombre;
        editProfileModal.classList.add('visible');
    });
    closeEditModal.addEventListener('click', () => editProfileModal.classList.remove('visible'));

    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newName = document.getElementById('edit-name-input').value;
        const newAvatarFile = document.getElementById('edit-avatar-input').files[0];
        const newBannerFile = document.getElementById('edit-banner-input').files[0];

        // Actualizar datos locales
        myArtistData.nombre = newName;
        if(newAvatarFile) myArtistData.profilePic = await readFileAsBase64(newAvatarFile);
        if(newBannerFile) myArtistData.bannerPic = await readFileAsBase64(newBannerFile);

        // Guardar en DB
        const db = obtenerDatos();
        const index = db.artistas.findIndex(a => a.id === MY_USER_ID);
        if(index !== -1) {
            db.artistas[index] = myArtistData;
        } else {
            db.artistas.push(myArtistData);
        }
        guardarDatos(db);

        // Reflejar cambios
        cargarPerfilUsuario();
        editProfileModal.classList.remove('visible');
    });

    // Helper
    const readFileAsBase64 = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });

    // Conectar botón de portada al modal de edición
const btnCambiarPortada = document.getElementById('btn-cambiar-portada');
if (btnCambiarPortada) {
    btnCambiarPortada.addEventListener('click', () => {
        // Abrimos el modal de editar perfil
        document.getElementById('edit-name-input').value = myArtistName.textContent;
        editProfileModal.classList.add('visible');
        // Opcional: Podríamos hacer focus en el input de banner, pero con abrirlo basta
    });
}

    // INICIALIZAR FEED SOCIAL TAMBIÉN EN PERFIL
    // Como estamos en profile.html, necesitamos renderizar el feed si queremos verlo ahí
    const socialFeed = document.getElementById('social-feed');
    if (socialFeed) {
        const { posts, artistas } = obtenerDatos();
        // Reutilizamos la lógica de renderizado simple
        socialFeed.innerHTML = posts.map(post => {
            const artista = artistas.find(a => a.id === post.artistaId) || { nombre: 'Usuario', profilePic: '' };
            return `
                <div class="social-post">
                    <div class="post-header">
                        <img src="${artista.profilePic}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;margin-right:10px;">
                        <strong>${artista.nombre}</strong>
                    </div>
                    <div style="margin-left:40px;font-size:13px;color:#ddd;margin-top:5px;">${post.texto}</div>
                </div>
            `;
        }).join('');
    }
// --- EN main.js ---

    // LÓGICA SOCIAL (PUBLICAR)
    const btnPublicar = document.getElementById('btn-publicar');
    const inputPost = document.getElementById('post-input');

    // Función auxiliar para repintar el feed
    function actualizarFeedVisualmente() {
        const { posts, artistas } = obtenerDatos(); // Obtenemos datos FRESCOS
        const socialFeed = document.getElementById('social-feed');
        
        if (socialFeed) {
            socialFeed.innerHTML = posts.map(post => {
                const artista = artistas.find(a => a.id === post.artistaId) || { nombre: 'Usuario', profilePic: 'https://via.placeholder.com/150' };
                return `
                    <div class="social-post animate-fade-in"> <!-- Agregamos clase para animación -->
                        <div class="post-header">
                            <img src="${artista.profilePic}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;margin-right:10px;">
                            <strong>${artista.nombre}</strong>
                            <span style="font-size:11px; color:#666; margin-left:5px;">Hace un instante</span>
                        </div>
                        <div style="margin-left:40px;font-size:13px;color:#ddd;margin-top:5px;">${post.texto}</div>
                    </div>
                `;
            }).join('');
        }
    }

    if (btnPublicar && inputPost) {
        btnPublicar.addEventListener('click', () => {
            const texto = inputPost.value.trim();
            if (!texto) return;

            // 1. Guardar en DB
            publicarPost(texto);
            
            // 2. Limpiar input
            inputPost.value = ''; 

            // 3. ACTUALIZAR VISUALMENTE AL INSTANTE
            actualizarFeedVisualmente();
        });
    }

    // Asegúrate de llamar a esta función al cargar la página también, en lugar de renderSocialFeed() viejo.
    actualizarFeedVisualmente();

    // START
    cargarPerfilUsuario();
});