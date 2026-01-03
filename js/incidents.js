let selectedUrgency = null;
let lastRadioChecked = null;
let isSubmitting = false;

function handleRadioClick(radio) {
    const dropdown = document.getElementById('otros-dropdown');
    const otrosRadio = document.getElementById('otros-radio');
    const selectedDisplay = document.getElementById('otros-selected');
    const otrosSelect = document.getElementById('otros-select');

    if (lastRadioChecked === radio && radio.checked) {
        setTimeout(() => {
            radio.checked = false;
            lastRadioChecked = null;

            if (radio === otrosRadio && dropdown) {
                dropdown.style.display = 'none';
                if (selectedDisplay) selectedDisplay.style.display = 'none';
                if (otrosSelect) otrosSelect.selectedIndex = 0;
                otrosRadio.value = 'Otros';
            }
        }, 0);
    } else {
        lastRadioChecked = radio;

        if (radio === otrosRadio && dropdown) {
            dropdown.style.display = 'block';
            if (selectedDisplay) selectedDisplay.style.display = 'none';
            if (otrosSelect) otrosSelect.selectedIndex = 0;
            setTimeout(() => {
                if (otrosSelect) otrosSelect.focus();
            }, 100);
        } else {
            if (dropdown) dropdown.style.display = 'none';
            if (otrosSelect) otrosSelect.selectedIndex = 0;
            if (otrosRadio) otrosRadio.value = 'Otros';
            if (selectedDisplay) selectedDisplay.style.display = 'none';
        }
    }
}

function toggleOtrosDropdown() {
    const dropdown = document.getElementById('otros-dropdown');
    const otrosRadio = document.getElementById('otros-radio');
    const otrosSelect = document.getElementById('otros-select');
    const selectedDisplay = document.getElementById('otros-selected');
    const allRadios = document.querySelectorAll('input[name="category"]');

    allRadios.forEach(radio => {
        if (radio !== otrosRadio) {
            radio.checked = false;
        }
    });

    if (dropdown.style.display === 'none' || dropdown.style.display === '') {
        dropdown.style.display = 'block';
        otrosRadio.checked = true;
        lastRadioChecked = otrosRadio;
        selectedDisplay.style.display = 'none';

        setTimeout(() => {
            otrosSelect.focus();
            otrosSelect.click();
        }, 100);
    } else {
        dropdown.style.display = 'none';
        otrosSelect.selectedIndex = 0;
        otrosRadio.value = 'Otros';
    }
}

function selectOtrosCategory() {
    const select = document.getElementById('otros-select');
    const otrosRadio = document.getElementById('otros-radio');
    const dropdown = document.getElementById('otros-dropdown');
    const selectedDisplay = document.getElementById('otros-selected');

    console.log('selectOtrosCategory llamada, valor:', select.value);

    if (select.value && select.value !== '') {
        otrosRadio.value = select.value;
        otrosRadio.checked = true;
        lastRadioChecked = otrosRadio;

        console.log('Radio actualizado:', {
            value: otrosRadio.value,
            checked: otrosRadio.checked
        });

        selectedDisplay.innerHTML = `<i class="fa-solid fa-circle-check"></i> Categoría: <strong>${select.value}</strong>`;
        selectedDisplay.style.display = 'block';
        dropdown.style.display = 'none';
    }
}

function setupPriorityButtons() {
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.onclick = function() {
            const level = this.dataset.level;
            selectedUrgency = (selectedUrgency === level) ? null : level;
            document.querySelectorAll('.priority-btn').forEach(b => b.className = 'priority-btn');

            const urgencyInput = document.getElementById('urgency-input');
            if (selectedUrgency) {
                this.classList.add('selected', `urgency-${level}`);
                urgencyInput.value = selectedUrgency;
            } else {
                urgencyInput.value = '';
            }
        };
    });
}

async function handleSubmit(e) {
    e.preventDefault();

    console.log('%c📝 INICIO DE ENVÍO DE INCIDENCIA', 'background: #9B59B6; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

    if (isSubmitting) {
        console.log('%c⚠️ Ya hay un envío en proceso', 'color: orange;');
        return;
    }

    const category = e.target.querySelector('input[name="category"]:checked');
    const urgency = document.getElementById('urgency-input').value;
    const title = e.target.title.value.trim();
    const description = e.target.description.value.trim();

    console.log('%c📋 Validación del formulario:', 'color: #9B59B6; font-weight: bold;');
    console.log('  • Categoría:', category ? category.value : 'NO SELECCIONADO');
    console.log('  • Urgencia:', urgency || 'NO SELECCIONADO');
    console.log('  • Título:', title || 'VACÍO');
    console.log('  • Descripción:', description || 'VACÍO');

    if (!category || !urgency || !title || !description) {
        console.error('%c❌ Validación fallida: faltan campos', 'color: red; font-weight: bold;');
        alert('Completa todos los campos: Categoría, Urgencia, Título y Descripción');
        showToast('Completa todos los campos');
        return;
    }

    isSubmitting = true;
    const btn = document.getElementById('btnSubmit');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

    console.log('%c🔍 Obteniendo vinculación de propiedad...', 'color: #3498DB;');

    try {
        // Obtener el id de la propiedad vinculada con timeout
        const vinculacionPromise = _supabase
            .from('perfil_propiedades')
            .select('codigo_propiedad')
            .eq('id_perfil_inquilino', currentUser.id)
            .maybeSingle();

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout obteniendo vinculación')), 10000)
        );

        const { data: vinculacion, error: vinculacionError } = await Promise.race([
            vinculacionPromise,
            timeoutPromise
        ]);

        if (vinculacionError) {
            console.error('%c❌ Error obteniendo vinculación:', 'color: red; font-weight: bold;', vinculacionError);
            showToast('Error al obtener datos de propiedad');
            btn.disabled = false;
            btn.innerHTML = 'Enviar Reporte <i class="fa-solid fa-paper-plane"></i>';
            isSubmitting = false;
            return;
        }

        console.log('  ✓ Vinculación obtenida:', vinculacion);

        const incidenciaData = {
            titulo: title,
            descripcion: e.target.description.value.trim(),
            categoria: category.value,
            urgencia: selectedUrgency,
            direccion: document.getElementById('inc-address').value,
            telefono: document.getElementById('inc-phone').value,
            user_id: currentUser.id,
            propiedad_id: vinculacion?.codigo_propiedad || null,
            nombre_inquilino: currentUser.user_metadata.full_name,
            email_inquilino: currentUser.email,
            estado: 'Enviada'
        };

        console.log('%c📤 Datos a enviar:', 'color: #9B59B6; font-weight: bold;');
        console.log('  • Título:', incidenciaData.titulo);
        console.log('  • Categoría:', incidenciaData.categoria);
        console.log('  • Urgencia:', incidenciaData.urgencia);
        console.log('  • Dirección:', incidenciaData.direccion);
        console.log('  • Teléfono:', incidenciaData.telefono);
        console.log('  • User ID:', incidenciaData.user_id);
        console.log('  • Propiedad ID:', incidenciaData.propiedad_id, `(${typeof incidenciaData.propiedad_id})`);

        console.log('%c💾 Insertando en Supabase...', 'color: #3498DB;');

        const { error } = await _supabase.from('incidencias').insert([incidenciaData]);

        console.log('%c📥 Respuesta de Supabase:', 'color: #9B59B6; font-weight: bold;');

        if (error) {
            console.error('%c❌ ERROR AL INSERTAR:', 'background: #E74C3C; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            console.error('  • Código:', error.code);
            console.error('  • Mensaje:', error.message);
            console.error('  • Detalles:', error.details);
            console.error('  • Hint:', error.hint);
            console.error('  • Error completo:', error);

            // Si es un error de autenticación, mostrar mensaje específico
            if (error.message && error.message.includes('JWT')) {
                showToast('Sesión expirada. Por favor, inicia sesión de nuevo.');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                showToast('Error al enviar: ' + (error.message || 'Desconocido'));
            }

            btn.disabled = false;
            btn.innerHTML = 'Enviar Reporte <i class="fa-solid fa-paper-plane"></i>';
            isSubmitting = false;
        } else {
            console.log('%c✅ INCIDENCIA CREADA EXITOSAMENTE', 'background: #27AE60; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

            btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Enviado correctamente';
            btn.classList.add('success');

            setTimeout(() => {
                e.target.reset();
                selectedUrgency = null;
                lastRadioChecked = null;
                document.querySelectorAll('.priority-btn').forEach(b => b.className = 'priority-btn');
                document.getElementById('urgency-input').value = '';

                const dropdown = document.getElementById('otros-dropdown');
                const otrosSelect = document.getElementById('otros-select');
                const otrosRadio = document.getElementById('otros-radio');
                const selectedDisplay = document.getElementById('otros-selected');
                if (dropdown) dropdown.style.display = 'none';
                if (otrosSelect) otrosSelect.selectedIndex = 0;
                if (otrosRadio) otrosRadio.value = 'Otros';
                if (selectedDisplay) selectedDisplay.style.display = 'none';

                btn.className = 'submit-btn';
                btn.innerHTML = 'Enviar a Housezen <i class="fa-solid fa-paper-plane"></i>';
                btn.disabled = false;
                isSubmitting = false;
                showPage('incidencias');
            }, 1500);
        }

    } catch (err) {
        console.error('%c❌ Error inesperado:', 'color: red; font-weight: bold;', err);
        showToast('Error inesperado: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = 'Enviar Reporte <i class="fa-solid fa-paper-plane"></i>';
        isSubmitting = false;
    }
}

async function renderIncidents() {
    const container = document.getElementById('incidents-list-container');

    const localData = localStorage.getItem('cache_incidencias');
    if (localData) {
        const incidents = JSON.parse(localData);
        dibujarIncidencias(incidents, true);
    } else {
        container.innerHTML = `
            <div class="loading-state">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <div class="empty-state-text">Cargando reportes...</div>
            </div>
        `;
    }

    try {
        if (!currentUser) {
            const { data: { session } } = await _supabase.auth.getSession();
            if (session) currentUser = session.user;
            else return;
        }

        const { data, error } = await _supabase
            .from('incidencias')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error loading incidents:", error);

            // Si es un error de autenticación, recargar página
            if (error.message && error.message.includes('JWT')) {
                showToast('Sesión expirada. Recargando...');
                setTimeout(() => window.location.reload(), 1500);
                return;
            }

            throw error;
        }

        localStorage.setItem('cache_incidencias', JSON.stringify(data));
        dibujarIncidencias(data, false);

    } catch (err) {
        console.error("Error de red:", err);
        if (!localData) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-wifi-slash"></i>
                    <div class="empty-state-text">No se pudieron cargar los reportes</div>
                    <button class="submit-btn" style="margin-top: 20px; max-width: 250px;" onclick="renderIncidents()">
                        <i class="fa-solid fa-rotate"></i> Reintentar
                    </button>
                </div>
            `;
        }
    }
}

function dibujarIncidencias(data, isOffline) {
    const container = document.getElementById('incidents-list-container');

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-clipboard-list"></i>
                <div class="empty-state-text">Aún no has reportado incidencias</div>
            </div>
        `;
        return;
    }

    let html = '';

    if (isOffline) {
        html += `
            <div class="offline-banner">
                <i class="fa-solid fa-clock-rotate-left"></i>
                Mostrando datos guardados.
                <span class="refresh-link" onclick="renderIncidents()">Refrescar para ver nuevos</span>
            </div>
        `;
    }

    html += data.map(inc => `
        <div class="incident-item">
            <div class="incident-header">
                <div class="incident-title">${inc.titulo}</div>
                <span class="status-badge status-${inc.estado || 'Enviada'}">${inc.estado || 'Enviada'}</span>
            </div>
            <p class="incident-description">${inc.descripcion || 'Sin descripción'}</p>
            <div class="incident-footer">
                <span>${new Date(inc.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span class="incident-category">#${inc.categoria.toUpperCase()}</span>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}
