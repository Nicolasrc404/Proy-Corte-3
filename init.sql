-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
            AND indexname = 'idx_users_email'
    ) THEN
        DROP INDEX idx_users_email;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uni_users_email'
            AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT uni_users_email UNIQUE (email);
    END IF;
END;
$$;

-- Alchemists table
CREATE TABLE IF NOT EXISTS alchemists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL,
    specialty VARCHAR(255),
    rank VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Missions table
CREATE TABLE IF NOT EXISTS missions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty VARCHAR(32),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    assigned_to INTEGER REFERENCES alchemists (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Transmutations table
CREATE TABLE IF NOT EXISTS transmutations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
    material_id INTEGER REFERENCES materials (id) ON DELETE SET NULL,
    formula TEXT,
    quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    result TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Audits table
CREATE TABLE IF NOT EXISTS audits (
    id SERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    entity VARCHAR(255) NOT NULL,
    entity_id INTEGER,
    user_email VARCHAR(255),
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Seed Users
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

-- Seed Alchemists
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

-- Seed Materials
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

-- Seed Missions
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
        'Mapear el nexo de cristales resonantes en la región norte.',
        'HIGH',
        'COMPLETED',
        3,
        NOW() - INTERVAL '7 day',
        NOW() - INTERVAL '1 day'
    ) ON CONFLICT (id) DO NOTHING;

-- Seed Transmutations
INSERT INTO
    transmutations (
        id,
        user_id,
        material_id,
        formula,
        quantity,
        status,
        result,
        created_at,
        updated_at
    )
VALUES (
        1,
        1,
        1,
        'Hg -> Au catalizado con runas vegetales',
        15.0,
        'COMPLETED',
        'Transformación exitosa con pureza 98%.',
        NOW() - INTERVAL '10 day',
        NOW() - INTERVAL '9 day'
    ),
    (
        2,
        2,
        2,
        'Fe + Azufre Solar -> Aleación Celeste',
        32.5,
        'PROCESSING',
        'Iteración en curso, estabilidad alcanzada 70%.',
        NOW() - INTERVAL '2 day',
        NOW() - INTERVAL '1 day'
    ),
    (
        3,
        3,
        3,
        'Mandrágora destilada para catalizador onírico',
        8.0,
        'PENDING',
        'Preparación en fase de análisis.',
        NOW() - INTERVAL '12 hour',
        NOW() - INTERVAL '12 hour'
    ) ON CONFLICT (id) DO NOTHING;

-- Seed Audits
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
        'CREATE',
        'mission',
        1,
        'selene@alquimia.test',
        'Asignación inicial de misión imperial.',
        NOW() - INTERVAL '3 day',
        NOW() - INTERVAL '3 day'
    ),
    (
        2,
        'UPDATE',
        'transmutation',
        2,
        'benedict@alquimia.test',
        'Ajuste en proporciones de azufre solar.',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    ),
    (
        3,
        'VERIFY',
        'material',
        4,
        'aurelia@alquimia.test',
        'Verificación de inventario para Agua Lustral.',
        NOW() - INTERVAL '6 hour',
        NOW() - INTERVAL '6 hour'
    ) ON CONFLICT (id) DO NOTHING;

-- Align sequences with seeded data
SELECT setval (
        'users_id_seq', (
            SELECT COALESCE(MAX(id), 0)
            FROM users
        )
    );

SELECT setval (
        'alchemists_id_seq', (
            SELECT COALESCE(MAX(id), 0)
            FROM alchemists
        )
    );

SELECT setval (
        'materials_id_seq', (
            SELECT COALESCE(MAX(id), 0)
            FROM materials
        )
    );

SELECT setval (
        'missions_id_seq', (
            SELECT COALESCE(MAX(id), 0)
            FROM missions
        )
    );

SELECT setval (
        'transmutations_id_seq', (
            SELECT COALESCE(MAX(id), 0)
            FROM transmutations
        )
    );

SELECT setval (
        'audits_id_seq', (
            SELECT COALESCE(MAX(id), 0)
            FROM audits
        )
    );