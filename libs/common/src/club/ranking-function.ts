export const rankingFunction = (score1: number, score2: number ): number => {
    return score1 > score2 ? 3 : score1 === score2 ? 1 : 0;
}  