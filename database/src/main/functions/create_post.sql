CREATE OR REPLACE FUNCTION main.create_post(
    p_id BIGINT,
    p_user_id UUID,
    p_parent_post_id BIGINT,
    p_content_type INT,
    p_content TEXT,
    p_comments_enabled BOOLEAN DEFAULT TRUE,
    p_title TEXT DEFAULT NULL
)
    RETURNS TABLE
            (
                id             BIGINT,
                parent_post_id BIGINT,
                title          TEXT,
                content_type   INT,
                content        TEXT
            )
AS
$$
DECLARE
    v_parent_path ltree;
    v_new_path    ltree;
BEGIN
    -- 1. Формируем путь ltree
    IF p_parent_post_id IS NULL THEN
        -- Если это новый тред, путь = просто ID поста
        v_new_path := p_id::text::ltree;
    ELSE
        -- Запрашиваем путь родителя
        SELECT path
        INTO v_parent_path
        FROM main.posts
        WHERE main.posts.id = p_parent_post_id
          AND main.posts.deleted_at IS NULL;

        -- Защита от "битых" ссылок
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent post % does not exist or is deleted', p_parent_post_id
                USING ERRCODE = '22023';
        END IF;

        IF nlevel(v_parent_path) >= 50 THEN
            RAISE EXCEPTION 'Maximum post thread depth exceeded'
                USING ERRCODE = '22023';
        END IF;

        -- Склеиваем путь: путь_родителя || свой_id
        v_new_path := v_parent_path || p_id::text::ltree;
    END IF;

    -- 2. Создаем сам пост
    INSERT INTO main.posts (id, parent_post_id, path, title, content_type, content, comments_enabled)
    VALUES (p_id, p_parent_post_id, v_new_path, p_title, p_content_type, p_content, p_comments_enabled);

    -- 3. Создаем связь поста с пользователем
    INSERT INTO main.user_posts (post_id, user_id)
    VALUES (p_id, p_user_id);

    -- 4. Инициализируем статистику для НОВОГО поста (чтобы потом на него тоже могли отвечать)
    INSERT INTO main.post_stats (post_id)
    VALUES (p_id)
    ON CONFLICT (post_id) DO NOTHING;

    -- 5. Обновляем количество реплаев у РОДИТЕЛЬСКОГО поста (если он есть)
    IF p_parent_post_id IS NOT NULL THEN
        UPDATE main.post_stats
        SET replies_count = replies_count + 1
        WHERE post_id = p_parent_post_id;
    END IF;

    -- 6. Возвращаем результат
    -- Так как мы уже знаем все вставленные данные из входных параметров функции, 
    -- нам не нужно делать еще один SELECT из таблицы posts. Отдаем переменные напрямую!
    RETURN QUERY
        SELECT p_id,
               p_parent_post_id,
               p_title,
               p_content_type,
               p_content;

END;
$$ LANGUAGE plpgsql;
