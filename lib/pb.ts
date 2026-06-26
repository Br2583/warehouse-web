import PocketBase from 'pocketbase';

export const pb = new PocketBase('https://pocketbase-production-e699.up.railway.app');
pb.autoCancellation(false);
