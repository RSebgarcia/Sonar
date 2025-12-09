// --- main.js ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. CARGA DE DATOS (Incluyendo los semilla si es la primera vez)
    const { artistas, discos, canciones, posts } = obtenerDatos();

    // ELEMENTOS UI
    const songGrid = document.getElementById('song-grid');
    const mainView = document.getElementById('main-view');
    const artistView = document.getElementById('artist-view');
    const socialFeed = document.getElementById('social-feed');
    const searchInput = document.getElementById('searchInput');

    // ELEMENTOS REPRODUCTOR
    const audioPlayer = document.getElementById('audio-player');
    const playBtn = document.querySelector('.play-button');
    const progressBar = document.getElementById('progress-bar');
    const currTimeLabel = document.getElementById('current-time');
    const totalTimeLabel = document.getElementById('total-duration');
    const playerTitle = document.getElementById('player-title');
    const playerArtist = document.getElementById('player-artist');
    const playerCover = document.getElementById('player-cover');

    let isPlaying = false;

    // --- FUNCIONES RENDERIZADO ---
    
    // 1. GRID PRINCIPAL
    function renderGrid(listaCanciones) {
        songGrid.innerHTML = '';
        if(listaCanciones.length === 0) {
            songGrid.innerHTML = '<p>No hay canciones.</p>';
            return;
        }
        
        // Mostrar en orden inverso (nuevos primero)
        [...listaCanciones].reverse().forEach(cancion => {
            const artista = artistas.find(a => a.id === cancion.artistaId);
            const disco = discos.find(d => d.id === cancion.discoId);
            
            const card = document.createElement('div');
            card.className = 'song-card';
            card.innerHTML = `
                <img src="${disco.cover}" loading="lazy">
                <h4>${cancion.titulo}</h4>
                <p>${artista.nombre}</p>
            `;
            card.addEventListener('click', () => playSong(cancion, artista, disco));
            songGrid.appendChild(card);
        });
    }

    // 2. SIDEBAR SOCIAL (Estilo Twitter)
    function renderSocialFeed() {
        socialFeed.innerHTML = '';
        if(!posts || posts.length === 0) return;

        posts.forEach(post => {
            const artista = artistas.find(a => a.id === post.artistaId);
            const div = document.createElement('div');
            div.className = 'social-post';
            div.innerHTML = `
                <div class="post-header">
                    <img src="${artista.profilePic}" alt="pic">
                    <strong>${artista.nombre}</strong>
                    <span>@${artista.nombre.toLowerCase().replace(/\s/g,'')}</span>
                </div>
                <div class="post-content">
                    ${post.texto}
                </div>
            `;
            socialFeed.appendChild(div);
        });
    }

    // --- LÓGICA REPRODUCTOR ---

    async function playSong(cancion, artista, disco) {
        // UI
        playerTitle.textContent = cancion.titulo;
        playerArtist.textContent = artista.nombre;
        playerCover.src = disco.cover;
        
        // Reset Player
        audioPlayer.pause();
        playBtn.className = "fas fa-spinner fa-spin"; 

        try {
            // VERIFICAR ORIGEN DEL AUDIO
            // Si tiene urlExterna (Datos Semilla) o si viene de IndexedDB
            let src = '';
            
            if (cancion.urlExterna) {
                src = cancion.urlExterna; // Usar URL remota para los datos falsos
            } else {
                // Intentar buscar en IndexedDB (Cargas del usuario)
                const blob = await obtenerAudio(cancion.id);
                if (blob) {
                    src = URL.createObjectURL(blob);
                } else {
                    throw new Error("Audio no encontrado");
                }
            }

            audioPlayer.src = src;
            audioPlayer.play();
            isPlaying = true;
            playBtn.className = "fas fa-pause";

        } catch (error) {
            console.error(error);
            alert("Error al reproducir. Revisa la consola.");
            playBtn.className = "fas fa-play";
        }
    }

    // Control Play/Pause
    document.querySelector('.play-circle-bg').addEventListener('click', () => {
        if(!audioPlayer.src) return;
        if(isPlaying) {
            audioPlayer.pause();
            playBtn.className = "fas fa-play";
            isPlaying = false;
        } else {
            audioPlayer.play();
            playBtn.className = "fas fa-pause";
            isPlaying = true;
        }
    });

    // Barra de Progreso
    audioPlayer.addEventListener('timeupdate', (e) => {
        const { duration, currentTime } = e.srcElement;
        if (duration) {
            const progressPercent = (currentTime / duration) * 100;
            progressBar.value = progressPercent;
            
            // Tiempos formateados
            currTimeLabel.textContent = formatTime(currentTime);
            totalTimeLabel.textContent = formatTime(duration);
        }
    });

    // Click en la barra de progreso
    progressBar.addEventListener('input', () => {
        const duration = audioPlayer.duration;
        audioPlayer.currentTime = (progressBar.value * duration) / 100;
    });

    function formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' + sec : sec}`;
    }

    // --- VISTAS Y NAVEGACIÓN ---
    // (Simplificado para el demo)
    document.getElementById('back-to-main-view').addEventListener('click', () => {
        artistView.style.display = 'none';
        mainView.style.display = 'block';
    });

    // Búsqueda
    searchInput.addEventListener('keyup', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = canciones.filter(c => c.titulo.toLowerCase().includes(term));
        renderGrid(filtered);
    });

    // --- AGREGAR ESTO DENTRO DEL DOMContentLoaded de main.js ---

    // LÓGICA SOCIAL (PUBLICAR)

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


    // --- INICIALIZAR ---
    renderGrid(canciones);
    renderSocialFeed();





});