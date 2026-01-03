async function login() {
    const returnUrl = "https://housezenapp.github.io/housezen/";

    const { data, error } = await _supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: returnUrl
        }
    });

    if (error) {
        showToast("Error al iniciar sesión");
        return;
    }
}

async function logout() {
    console.log('%c🚪 Cerrando sesión...', 'background: #E74C3C; color: white; padding: 4px 8px; border-radius: 4px;');

    // Limpiar storage inmediatamente
    localStorage.clear();
    sessionStorage.clear();

    // Intentar cerrar sesión en Supabase sin esperar (fire and forget)
    _supabase.auth.signOut().catch(err => {
        console.log('%c⚠️ Error al cerrar sesión en Supabase (ignorado):', 'color: orange;', err.message);
    });

    // Redirigir inmediatamente
    console.log('%c↩️ Redirigiendo al login...', 'color: #3498DB;');
    window.location.href = "https://housezenapp.github.io/housezen/";
}

async function initializeAuth() {
    _supabase.auth.onAuthStateChange(async (event, session) => {
        // Log detallado de eventos de autenticación
        console.log('%c🔐 AUTH EVENT', 'background: #2A9D8F; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;', event);

        if (session) {
            const expiresAt = new Date(session.expires_at * 1000);
            const now = new Date();
            const timeUntilExpiry = Math.floor((expiresAt - now) / 1000 / 60); // minutos

            console.log('%c📊 Session Info:', 'color: #2A9D8F; font-weight: bold;');
            console.log('  • Usuario:', session.user.email);
            console.log('  • Token expira:', expiresAt.toLocaleString('es-ES'));
            console.log('  • Tiempo restante:', timeUntilExpiry, 'minutos');
            console.log('  • Access Token (primeros 20 chars):', session.access_token.substring(0, 20) + '...');
        } else {
            console.log('%c⚠️ No session data', 'color: orange; font-weight: bold;');
        }

        if (event === 'SIGNED_IN' && session) {
            console.log('%c✅ Usuario ha iniciado sesión', 'color: green; font-weight: bold;');
            await handleUserSession(session);
        } else if (event === 'TOKEN_REFRESHED' && session) {
            // Token refrescado correctamente, actualizar usuario actual
            currentUser = session.user;
            console.log('%c🔄 TOKEN RENOVADO EXITOSAMENTE', 'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            console.log('  • Nuevo token obtenido');
            console.log('  • Session válida hasta:', new Date(session.expires_at * 1000).toLocaleString('es-ES'));

            // IMPORTANTE: Recargar datos de perfil y propiedad después de renovar token
            await reloadUserData();
        } else if (event === 'SIGNED_OUT') {
            // Solo cerrar sesión si realmente fue iniciado por el usuario (no automático)
            console.log('%c🚪 Evento SIGNED_OUT recibido', 'color: red; font-weight: bold;');

            // Verificar si realmente no hay sesión
            const { data: { session: currentSession } } = await _supabase.auth.getSession();

            if (!currentSession) {
                console.log('%c✓ Confirmado: no hay sesión, cerrando', 'color: red;');
                document.getElementById('login-page').style.display = 'flex';
                document.getElementById('app-content').style.display = 'none';
                document.getElementById('setup-modal').style.display = 'none';
            } else {
                console.log('%c⚠️ Falsa alarma: sesión todavía existe, ignorando SIGNED_OUT', 'color: orange; font-weight: bold;');
            }
        } else if (event === 'USER_DELETED') {
            console.log('%c🚪 Usuario eliminado', 'color: red; font-weight: bold;');
            document.getElementById('login-page').style.display = 'flex';
            document.getElementById('app-content').style.display = 'none';
            document.getElementById('setup-modal').style.display = 'none';
        }
    });

    try {
        console.log('%c🚀 Inicializando autenticación...', 'background: #264653; color: white; padding: 4px 8px; border-radius: 4px;');
        const { data: { session }, error } = await _supabase.auth.getSession();

        if (error) {
            console.error('%c❌ Error obteniendo sesión:', 'color: red; font-weight: bold;', error);
            document.getElementById('login-page').style.display = 'flex';
            document.getElementById('app-content').style.display = 'none';
            return;
        }

        if (session) {
            console.log('%c✓ Sesión existente encontrada', 'color: green;');
            await handleUserSession(session);
        } else {
            console.log('%c⚠️ No hay sesión activa', 'color: orange;');
            document.getElementById('login-page').style.display = 'flex';
            document.getElementById('app-content').style.display = 'none';
        }
    } catch (err) {
        console.error('%c❌ Error inicializando auth:', 'color: red; font-weight: bold;', err);
        document.getElementById('login-page').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }

    authInitialized = true;

    // Escuchar cuando el usuario vuelve a la pestaña para refrescar la sesión
    setupVisibilityListener();

    // Iniciar monitor de expiración de token
    startTokenExpiryMonitor();
}

// Nueva función para manejar visibilidad de la página
function setupVisibilityListener() {
    let wasHidden = false;

    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden && authInitialized && wasHidden) {
            console.log('%c👁️ Pestaña visible de nuevo', 'background: #E67E22; color: white; padding: 4px 8px; border-radius: 4px;');

            // IMPORTANTE: Recargar la página si estuvo oculta
            // Esto reinicia el cliente de Supabase y evita problemas de bloqueo
            console.log('%c🔄 Recargando página para reiniciar conexión...', 'color: #3498DB;');
            window.location.reload();

        } else if (document.hidden) {
            console.log('%c😴 Pestaña oculta', 'color: #95A5A6;');
            wasHidden = true;
        }
    });
}

// Monitor de expiración de token
let tokenExpiryInterval = null;

function startTokenExpiryMonitor() {
    // Limpiar intervalo anterior si existe
    if (tokenExpiryInterval) {
        clearInterval(tokenExpiryInterval);
    }

    // Revisar el estado cada 30 segundos
    tokenExpiryInterval = setInterval(async () => {
        try {
            const { data: { session } } = await _supabase.auth.getSession();

            if (session) {
                const expiresAt = new Date(session.expires_at * 1000);
                const now = new Date();
                const minutesLeft = Math.floor((expiresAt - now) / 1000 / 60);
                const secondsLeft = Math.floor((expiresAt - now) / 1000) % 60;

                if (minutesLeft <= 5) {
                    console.log(`%c⏰ Token expira pronto: ${minutesLeft}m ${secondsLeft}s`, 'background: #E74C3C; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
                } else if (minutesLeft <= 15) {
                    console.log(`%c⏰ Token expira en: ${minutesLeft}m ${secondsLeft}s`, 'background: #F39C12; color: white; padding: 4px 8px; border-radius: 4px;');
                }
            }
        } catch (err) {
            console.error('Error en monitor de expiración:', err);
        }
    }, 30000); // Cada 30 segundos
}

// Función para recargar datos del usuario después de refrescar token
async function reloadUserData() {
    try {
        console.log('%c🔃 Recargando datos del usuario...', 'color: #3498DB;');

        if (!currentUser) {
            console.log('%c⚠️ No hay currentUser, saltando recarga', 'color: orange;');
            return;
        }

        // Cargar el perfil completo
        const { data: currentProfile, error: profileError } = await _supabase
            .from('perfiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();

        if (profileError) {
            console.error('Error loading profile:', profileError);
            return;
        }

        // Cargar la propiedad vinculada
        const { data: vinculacion, error: vinculacionError } = await _supabase
            .from('perfil_propiedades')
            .select('codigo_propiedad')
            .eq('id_perfil_inquilino', currentUser.id)
            .maybeSingle();

        if (vinculacionError) {
            console.error('Error loading property link:', vinculacionError);
        }

        // Si hay vinculación, obtener los datos de la propiedad
        let propiedadData = null;
        if (vinculacion && vinculacion.codigo_propiedad) {
            const { data: propiedad, error: propError } = await _supabase
                .from('propiedades')
                .select('id, direccion_completa')
                .eq('id', vinculacion.codigo_propiedad)
                .maybeSingle();

            if (propError) {
                console.error('Error loading property:', propError);
            } else {
                propiedadData = propiedad;
            }
        }

        // Actualizar los campos del formulario de incidencias
        const incAddress = document.getElementById('inc-address');
        const incPhone = document.getElementById('inc-phone');

        if (propiedadData && incAddress) {
            incAddress.value = propiedadData.direccion_completa;
            console.log('  ✓ Dirección actualizada:', propiedadData.direccion_completa);
        }

        if (currentProfile && currentProfile.telefono && incPhone) {
            incPhone.value = currentProfile.telefono;
            console.log('  ✓ Teléfono actualizado:', currentProfile.telefono);
        }

        console.log('%c✅ Datos del usuario recargados', 'color: green; font-weight: bold;');

    } catch (err) {
        console.error('%c❌ Error recargando datos del usuario:', 'color: red;', err);
    }
}

// Función para obtener info de sesión actual (útil para debugging)
window.getSessionInfo = async function() {
    const { data: { session }, error } = await _supabase.auth.getSession();

    if (error) {
        console.error('%c❌ Error:', 'color: red; font-weight: bold;', error);
        return;
    }

    if (session) {
        const expiresAt = new Date(session.expires_at * 1000);
        const now = new Date();
        const minutesLeft = Math.floor((expiresAt - now) / 1000 / 60);

        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #2A9D8F;');
        console.log('%c📊 INFORMACIÓN DE SESIÓN ACTUAL', 'background: #2A9D8F; color: white; padding: 8px; border-radius: 4px; font-weight: bold; font-size: 14px;');
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #2A9D8F;');
        console.log('');
        console.log('%c👤 Usuario:', 'font-weight: bold; color: #2A9D8F;', session.user.email);
        console.log('%c🆔 User ID:', 'font-weight: bold; color: #2A9D8F;', session.user.id);
        console.log('');
        console.log('%c🔑 Token Info:', 'font-weight: bold; color: #264653;');
        console.log('  • Access Token:', session.access_token.substring(0, 30) + '...');
        console.log('  • Refresh Token:', session.refresh_token.substring(0, 30) + '...');
        console.log('');
        console.log('%c⏰ Expiración:', 'font-weight: bold; color: #E67E22;');
        console.log('  • Expira el:', expiresAt.toLocaleString('es-ES'));
        console.log('  • Tiempo restante:', minutesLeft, 'minutos');
        console.log('');
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #2A9D8F;');

        return session;
    } else {
        console.log('%c⚠️ No hay sesión activa', 'background: orange; color: white; padding: 4px 8px; border-radius: 4px;');
        return null;
    }
}

async function handleUserSession(session) {
    try {
        currentUser = session.user;
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';

        const fullName = currentUser.user_metadata?.full_name || "Usuario";
        const firstName = fullName.split(' ')[0];
        const userEmail = currentUser.email || '';

        document.getElementById('user-name').innerText = firstName;
        document.getElementById('profile-name').value = fullName;
        document.getElementById('profile-email').value = userEmail;

        // Crear o actualizar el perfil automáticamente con los datos de Google
        const { error: upsertError } = await _supabase
            .from('perfiles')
            .upsert({
                id: currentUser.id,
                email: userEmail,
                nombre: fullName,
                rol: 'inquilino' // <--- AÑADIR ESTA LÍNEA
            }, {
                onConflict: 'id',
                ignoreDuplicates: false
            });

        if (upsertError) {
            console.error('Error creating/updating profile:', upsertError);
        }

        // Cargar el perfil completo
        const { data: currentProfile, error: profileError } = await _supabase
            .from('perfiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();

        if (profileError) {
            console.error('Error loading profile:', profileError);
        }

        // Cargar la propiedad vinculada desde perfil_propiedades
        const { data: vinculacion, error: vinculacionError } = await _supabase
            .from('perfil_propiedades')
            .select('codigo_propiedad')
            .eq('id_perfil_inquilino', currentUser.id)
            .maybeSingle();

        if (vinculacionError) {
            console.error('Error loading property link:', vinculacionError);
        }

        // Si hay vinculación, obtener los datos de la propiedad usando el código
        let propiedadData = null;
        if (vinculacion && vinculacion.codigo_propiedad) {
            const { data: propiedad, error: propError } = await _supabase
                .from('propiedades')
                .select('id, direccion_completa')
                .eq('id', vinculacion.codigo_propiedad)
                .maybeSingle();

            if (propError) {
                console.error('Error loading property:', propError);
            } else {
                propiedadData = propiedad;
            }
        }

        // Verificar si el perfil está completo
        const isProfileComplete = currentProfile && currentProfile.telefono && vinculacion && vinculacion.codigo_propiedad && propiedadData;
        
        if (!isProfileComplete) {
            document.getElementById('setup-modal').style.display = 'flex';
        } else {
            // Ocultar el modal si el perfil está completo
            document.getElementById('setup-modal').style.display = 'none';
            
            // Cargar datos de la propiedad
            document.getElementById('inc-address').value = propiedadData.direccion_completa;
            document.getElementById('user-address').value = propiedadData.direccion_completa;
            document.getElementById('user-reference').value = vinculacion.codigo_propiedad;

            // Cargar teléfono del perfil
            document.getElementById('inc-phone').value = currentProfile.telefono;
            document.getElementById('user-phone').value = currentProfile.telefono;
        }
    } catch (err) {
        console.error('Error in handleUserSession:', err);
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        document.getElementById('setup-modal').style.display = 'flex';
    }
}
