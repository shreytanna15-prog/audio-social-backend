export type AdminProfile = {
    id: string;
    email: string;
    name: string | null;
    createdAt?: string;
};

export type AdminLoginBody = {
    email: string;
    password: string;
};

export type AdminLoginResult = {
    accessToken: string;
    admin: {
        id: string;
        email: string;
        name: string | null;
    };
};
