import PocketBase from 'pocketbase';

export const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-e699.up.railway.app');
pb.autoCancellation(false);
