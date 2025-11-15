-- Users
INSERT INTO
    users (
        id,
        name,
        specialty,
        email,
        password_hash,
        role,
        created_at,
        updated_at
    )
VALUES (
        1,
        'Aurelia Stone',
        'Transmutaciones Vegetales',
        'aurelia@alquimia.test',
        '$2a$10$LGtMLZC16FPzEOiy9O7SJ.HxGQ0NzxwkOviLSd4.e.eu2wINbZLx.',
        'alchemist',
        NOW(),
        NOW()
    ),
    (
        2,
        'Benedict Voss',
        'Metalurgia Arcana',
        'benedict@alquimia.test',
        '$2a$10$LGtMLZC16FPzEOiy9O7SJ.HxGQ0NzxwkOviLSd4.e.eu2wINbZLx.',
        'alchemist',
        NOW(),
        NOW()
    ),
    (
        3,
        'Selene Ward',
        'Supervisión y Auditoría',
        'selene@alquimia.test',
        '$2a$10$LGtMLZC16FPzEOiy9O7SJ.HxGQ0NzxwkOviLSd4.e.eu2wINbZLx.',
        'supervisor',
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

-- Alchemists directory
INSERT INTO
    alchemists (
        id,
        name,
        age,
        specialty,
        rank,
        created_at,
        updated_at
    )
VALUES (
        1,
        'Aurelia Stone',
        29,
        'Transmutaciones Vegetales',
        'Senior',
        NOW(),
        NOW()
    ),
    (
        2,
        'Benedict Voss',
        34,
        'Metalurgia Arcana',
        'Investigador',
        NOW(),
        NOW()
    ),
    (
        3,
        'Iris Calder',
        25,
        'Cristalización',
        'Aprendiz',
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

-- Materials inventory
INSERT INTO
    materials (
        id,
        name,
        category,
        quantity,
        created_at,
        updated_at
    )
VALUES (
        1,
        'Mercurio Purificado',
        'Metales',
        120.5,
        NOW(),
        NOW()
    ),
    (
        2,
        'Polvo de Azufre Solar',
        'Catalizadores',
        65.0,
        NOW(),
        NOW()
    ),
    (
        3,
        'Raíz de Mandrágora',
        'Orgánicos',
        240.75,
        NOW(),
        NOW()
    ),
    (
        4,
        'Agua Lustral',
        'Disolventes',
        500.0,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

-- Missions backlog
INSERT INTO
    missions (
        id,
        title,
        description,
        difficulty,
        status,
        assigned_to,
        created_at,
        updated_at
    )
VALUES (
        1,
        'Restaurar Jardín Imperial',
        'Reactivar los ciclos de vida del jardín sagrado.',
        'MEDIUM',
        'IN_PROGRESS',
        1,
        NOW() - INTERVAL '3 day',
        NOW()
    ),
    (
        2,
        'Refinar Aleación Celeste',
        'Crear una aleación estable para aeronaves del consejo.',
        'HIGH',
        'PENDING',
        2,
        NOW() - INTERVAL '1 day',
        NOW()
    ),
    (
        3,
        'Cartografiar Nexo Cristalino',
        'Mapear la resonancia del cristal azul profundo.',
        'LOW',
        'COMPLETED',
        3,
        NOW() - INTERVAL '10 day',
        NOW() - INTERVAL '2 day'
    ) ON CONFLICT (id) DO NOTHING;

-- Baseline audits
INSERT INTO
    audits (
        id,
        action,
        entity,
        entity_id,
        user_email,
        details,
        created_at,
        updated_at
    )
VALUES (
        1,
        'MISSION_CREATED',
        'mission',
        1,
        'selene@alquimia.test',
        'Misión registrada para Aurelia Stone.',
        NOW(),
        NOW()
    ),
    (
        2,
        'MISSION_CREATED',
        'mission',
        2,
        'selene@alquimia.test',
        'Misión registrada para Benedict Voss.',
        NOW(),
        NOW()
    ),
    (
        3,
        'USER_LOGIN',
        'user',
        3,
        'selene@alquimia.test',
        'Acceso de supervisor confirmado.',
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;

-- Reset sequences in case manual IDs were inserted
SELECT setval ( 'users_id_seq', ( SELECT MAX(id) FROM users ) );

SELECT setval (
        'alchemists_id_seq', (
            SELECT MAX(id)
            FROM alchemists
        )
    );

SELECT setval (
        'materials_id_seq', (
            SELECT MAX(id)
            FROM materials
        )
    );

SELECT setval (
        'missions_id_seq', (
            SELECT MAX(id)
            FROM missions
        )
    );

SELECT setval ( 'audits_id_seq', ( SELECT MAX(id) FROM audits ) );