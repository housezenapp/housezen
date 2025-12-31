async function saveUserData() {
    // 1. Capturamos los datos del nuevo HTML
    const reference = document.getElementById('user-reference').value.trim().toUpperCase();
    const phone = document.getElementById('user-phone').value.trim();

    if (!reference || !phone) {
        showToast("Faltan datos por completar");
        return;
    }

    const btn = document.getElementById('btnSave');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Validando...';

    try {
        // Buscar la propiedad por código de referencia (TABLA PROPIEDADES)
        const { data: propiedad, error: propError } = await _supabase
            .from('propiedades')
            .select('direccion_completa, perfil_id') // Mantenemos perfil_id para el casero
            .eq('id', reference)
            .maybeSingle();

        if (propError) throw propError;

        if (!propiedad) {
            showToast("Código no encontrado. Revisa con tu casero.");
            btn.disabled = false;
            btn.innerHTML = 'Guardar y Vincular';
            return;
        }

        // Actualizar el teléfono en el perfil
        const { error: perfilError } = await _supabase
            .from('perfiles')
            .update({ telefono: phone })
            .eq('id', currentUser.id);

        if (perfilError) throw perfilError;

        // --- AQUÍ ESTABA EL FALLO: Vinculación en perfil_propiedades ---
        
        // 1. Buscamos si ya existe el vínculo
        const { data: existingLink } = await _supabase
            .from('perfil_propiedades')
            .select('id_perfil_inquilino')
            .eq('id_perfil_inquilino', currentUser.id)
            .maybeSingle();

        let relacionError = null;

        if (existingLink) {
            // 2. Actualizar vinculación existente
            const { error } = await _supabase
                .from('perfil_propiedades')
                .update({ 
                    codigo_propiedad: reference, // CAMBIADO: de id_propiedad a codigo_propiedad
                    id_perfil_casero: propiedad.perfil_id // Aseguramos que el casero esté vinculado
                })
                .eq('id_perfil_inquilino', currentUser.id);
            relacionError = error;
        } else {
            // 3. Crear nueva vinculación
            const { error } = await _supabase
                .from('perfil_propiedades')
                .insert({
                    id_perfil_inquilino: currentUser.id,
                    id_perfil_casero: propiedad.perfil_id,
                    codigo_propiedad: reference // CAMBIADO: de id_propiedad a codigo_propiedad
                });
            relacionError = error;
        }

        if (relacionError) throw relacionError;

        // --- RESTO DE TU LÓGICA DE UI INTACTA ---
        document.getElementById('user-address').value = propiedad.direccion_completa;
        document.getElementById('user-reference').value = reference;

        if (document.getElementById('inc-address')) {
            document.getElementById('inc-address').value = propiedad.direccion_completa;
        }
        if (document.getElementById('inc-phone')) {
            document.getElementById('inc-phone').value = phone;
        }

        showToast("¡Vivienda vinculada correctamente!");
        btn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Listo!';
        btn.classList.add('success');

        setTimeout(() => {
            btn.classList.remove('success');
            btn.innerHTML = 'Guardar y Vincular';
            btn.disabled = false;
            showPage('home');
        }, 1500);

    } catch (error) {
        console.error("Error en la vinculación:", error);
        showToast("Error de conexión con la base de datos");
        btn.disabled = false;
        btn.innerHTML = 'Guardar y Vincular';
    }
}
