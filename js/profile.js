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
        console.log('🔍 Buscando propiedad con referencia:', reference);
        console.log('📏 Longitud de la referencia:', reference.length);
        console.log('🔢 Códigos de caracteres:', Array.from(reference).map(c => c.charCodeAt(0)));

        // Primero, listemos todas las propiedades para ver qué hay en la tabla
        const { data: todasPropiedades, error: listError } = await _supabase
            .from('propiedades')
            .select('id, direccion_completa');

        console.log('📋 Todas las propiedades en la tabla:', todasPropiedades);
        if (todasPropiedades) {
            console.log('🔑 IDs disponibles:', todasPropiedades.map(p => `"${p.id}" (longitud: ${p.id.length})`));
        }

        // 2. BUSCAMOS LA PROPIEDAD: Verificamos que el código existe en la tabla del casero
        const { data: propiedad, error: propError } = await _supabase
            .from('propiedades')
            .select('direccion_completa')
            .eq('id', reference)
            .maybeSingle();

        console.log('📦 Resultado de búsqueda:', { propiedad, propError });

        if (propError) {
            console.error('❌ Error al buscar propiedad:', propError);
            throw propError;
        }

        if (!propiedad) {
            console.warn('⚠️ No se encontró propiedad con ese código');
            showToast("Código no encontrado. Revisa con tu casero.");
            btn.disabled = false;
            btn.innerHTML = 'Guardar y Vincular';
            return;
        }

        console.log('✅ Propiedad encontrada:', propiedad.direccion_completa);

        // 3. GUARDAMOS EN PERFILES: Actualizamos solo el teléfono
        console.log('💾 Actualizando perfil del usuario:', currentUser.id);

        const { error: perfilError } = await _supabase
            .from('perfiles')
            .update({
                telefono: phone
            })
            .eq('id', currentUser.id);

        console.log('📝 Resultado de actualización perfil:', { perfilError });

        if (perfilError) {
            console.error('❌ Error al actualizar perfil:', perfilError);
            throw perfilError;
        }

        console.log('✅ Perfil actualizado correctamente');

        // 4. CREAR O ACTUALIZAR RELACIÓN EN perfil_propiedades
        console.log('🔗 Vinculando perfil con propiedad');

        const { error: relacionError } = await _supabase
            .from('perfil_propiedades')
            .upsert({
                id_perfil: currentUser.id,
                id_propiedad: reference
            }, {
                onConflict: 'id_perfil'
            });

        console.log('📝 Resultado de vinculación:', { relacionError });

        if (relacionError) {
            console.error('❌ Error al vincular perfil con propiedad:', relacionError);
            throw relacionError;
        }

        console.log('✅ Vinculación creada correctamente');

        // 5. ACTUALIZAMOS LA INTERFAZ
        // Escribimos la dirección en el campo bloqueado del perfil
        document.getElementById('user-address').value = propiedad.direccion_completa;
        document.getElementById('user-reference').value = reference;

        // También la actualizamos en el formulario de incidencias (home)
        if (document.getElementById('inc-address')) {
            document.getElementById('inc-address').value = propiedad.direccion_completa;
        }
        if (document.getElementById('inc-phone')) {
            document.getElementById('inc-phone').value = phone;
        }

        showToast("¡Vivienda vinculada correctamente!");
        btn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Listo!';
        btn.classList.add('success');

        // Volvemos a la home después de un momento
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
