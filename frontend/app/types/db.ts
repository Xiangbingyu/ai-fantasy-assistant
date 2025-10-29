export interface User {
    id: number;
    username: string;
    password: string;
    create_time: string;
    last_login: string | null;
}

export interface World {
    id: number;
    user_id: number;
    name: string;
    tags: string[];
    is_public: boolean;
    worldview: string;
    master_setting: string;
    main_characters: string;
    origin_world_id: number | null;
    last_access_time: string;
    create_time: string;
    update_time: string;
    popularity: number;
}