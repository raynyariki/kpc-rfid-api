export const config = {
    maxOccupancy: Number(process.env.MAX_OCCUPANCY)||6,
    duplicateWindowMs:(Number(process.env.DUPLICATE_WINDOW_SECONDS)||10)*1000,
};