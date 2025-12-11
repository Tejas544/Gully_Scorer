import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { createClient } from "@/utils/supabase/client";
import { ScoreInput, DismissalType, BallSchema } from "@/types/cricket";
import { checkAndCreateFinal } from '@/utils/league-logic';

// --- Types ---

interface MatchResult {
  winnerId: string | null;
  message: string;
}

interface TeamIds {
  batting: string;
  bowling: string;
}

interface InningsPayload {
  id: string;
  innings_number: 1 | 2;
  batting_team_id: string;
  total_runs: number;
  total_wickets: number;
  legal_balls_bowled: number;
  is_completed: boolean;
}

interface MatchDataPayload {
  team_a_id: string;
  team_b_id: string;
  season_id: string;
  round_number: number;
  winner_id?: string | null;
  result_note?: string | null;
}

interface MatchState {
  matchId: string | null;
  inningsId: string | null;
  teamIds: TeamIds | null;
  seasonId: string | null;
  roundNumber: number;

  // Scoring
  totalRuns: number;
  totalWickets: number;
  legalBallsBowled: number;
  ballsHistory: BallSchema[];

  // Game State
  inningsNumber: 1 | 2;
  target: number | null;
  inningsStatus: "active" | "completed";
  matchResult: MatchResult | null;

  // UI / transient state
  isLoading?: boolean;
  error?: string | null;

  // Actions
  initializeMatch: (matchId: string, innings: InningsPayload, matchData: MatchDataPayload) => void;
  recordBall: (input: ScoreInput, dismissal?: DismissalType) => Promise<void>;
  startSecondInnings: () => Promise<void>;
  undoLastBall: () => Promise<void>;
  fetchMatchHistory: () => Promise<void>;
}

// --- Logic Helpers ---

const MAX_LEGAL_BALLS_REGULAR = 12; // 2 Overs
const MAX_LEGAL_BALLS_SUPER = 6;    // 1 Over for Super Over
const MAX_WICKETS = 1; // 1v1 Format

// --- Store ---

export const useMatchStore = create<MatchState>()(
  devtools(
    (set, get) => ({
      // Initial state
      matchId: null,
      inningsId: null,
      teamIds: null,
      seasonId: null,
      roundNumber: 0,
      totalRuns: 0,
      totalWickets: 0,
      legalBallsBowled: 0,
      ballsHistory: [],
      inningsNumber: 1,
      target: null,
      inningsStatus: "active",
      matchResult: null,
      isLoading: false,
      error: null,

      initializeMatch: (matchId, innings, matchData) => {
        const battingId = innings.batting_team_id;
        const bowlingId = matchData.team_a_id === battingId ? matchData.team_b_id : matchData.team_a_id;

        set({
          matchId,
          inningsId: innings.id,
          seasonId: matchData.season_id,
          roundNumber: matchData.round_number,
          inningsNumber: innings.innings_number,
          totalRuns: innings.total_runs,
          totalWickets: innings.total_wickets,
          legalBallsBowled: innings.legal_balls_bowled,
          ballsHistory: [],
          inningsStatus: innings.is_completed ? "completed" : "active",
          teamIds: { batting: battingId, bowling: bowlingId },
          matchResult: matchData.winner_id
            ? { winnerId: matchData.winner_id, message: matchData.result_note ?? "" }
            : null,
          error: null,
        });
      },

      recordBall: async (input, dismissal) => {
        const state = get();

        // 1. Validation Guards
        if (state.inningsStatus === "completed" || state.matchResult) return;
        if (!state.inningsId) {
          console.error("No active innings initialized");
          return;
        }

        // 2. Calculate Outcome (Pure Logic)
        let runsToAdd = 0;
        let extras = 0;
        let isWide = false;
        let isNoBall = false;
        let isWicket = false;
        let isLegal = true;

        switch (input.type) {
          case "runs":
            runsToAdd = input.value;
            break;
          case "wide":
            isWide = true;
            extras = 1;
            isLegal = false;
            break;
          case "no_ball":
            isNoBall = true;
            extras = 1;
            isLegal = false;
            break;
          case "wicket":
            isWicket = true;
            runsToAdd = 0;
            break;
        }

        // 3. Prepare New State (Optimistic)
        const newTotalRuns = state.totalRuns + runsToAdd + extras;
        const newTotalWickets = isWicket ? state.totalWickets + 1 : state.totalWickets;
        const newLegalBalls = isLegal ? state.legalBallsBowled + 1 : state.legalBallsBowled;

        // --- GAME LOGIC START ---
        
        const maxBalls = state.roundNumber === 101 ? MAX_LEGAL_BALLS_SUPER : MAX_LEGAL_BALLS_REGULAR;
        
        let isOver = newTotalWickets >= MAX_WICKETS || newLegalBalls >= maxBalls;

        let matchFinished = false;
        let winnerId: string | null = null;
        let resultMessage = "";

        if (state.inningsNumber === 2 && state.target) {
          if (newTotalRuns >= state.target) {
            isOver = true;
            matchFinished = true;
            winnerId = state.teamIds?.batting || null;
            resultMessage = "Chased down successfully!";
          } else if (isOver) {
            matchFinished = true;
            if (newTotalRuns === state.target - 1) {
              winnerId = null; // TIE
              if (state.roundNumber < 100) {
                  resultMessage = "Match Tied (1 pt each)";
              } else if (state.roundNumber === 100) {
                  resultMessage = "Match Tied! (Super Over needed)";
              } else if (state.roundNumber === 101) {
                  resultMessage = "Bowl Out Needed!";
              }
            } else {
              winnerId = state.teamIds?.bowling || null;
              resultMessage = "Defended the target!";
            }
          }
        }
        // --- GAME LOGIC END ---

        const newBall: BallSchema = {
          id: crypto.randomUUID(),
          innings_id: state.inningsId,
          ball_index: state.ballsHistory.length,
          runs_batter: (runsToAdd as unknown) as 0 | 1,
          extras,
          is_wide: isWide,
          is_no_ball: isNoBall,
          is_wicket: isWicket,
          dismissal_kind: dismissal ?? null,
        };

        // 4. Update UI IMMEDIATELY
        set({
          totalRuns: newTotalRuns,
          totalWickets: newTotalWickets,
          legalBallsBowled: newLegalBalls,
          ballsHistory: [...state.ballsHistory, newBall],
          inningsStatus: isOver ? "completed" : "active",
          matchResult: matchFinished ? { winnerId, message: resultMessage } : null,
          error: null,
        });

        // 5. Sync with Supabase (Background)
        const supabase = createClient();

        try {
          // A. Insert Ball
          const { error: ballError } = await supabase.from("balls").insert({
            innings_id: state.inningsId,
            runs_batter: runsToAdd,
            extras,
            is_wide: isWide,
            is_no_ball: isNoBall,
            is_wicket: isWicket,
            dismissal_kind: dismissal,
            ball_index: state.ballsHistory.length,
          });
          if (ballError) throw ballError;

          // B. Update Innings Summary
          const { error: inningsError } = await supabase
            .from("innings")
            .update({
              total_runs: newTotalRuns,
              total_wickets: newTotalWickets,
              legal_balls_bowled: newLegalBalls,
              is_completed: isOver,
            })
            .eq("id", state.inningsId);

          if (inningsError) throw inningsError;

          // C. IF MATCH FINISHED: Update Match Table & SAVE CAREER STATS
          if (matchFinished) {
            console.log("🏆 Match Finished! Starting Sync...");

            const { error: matchError } = await supabase
              .from("matches")
              .update({
                winner_id: winnerId,
                is_completed: true,
                result_note: resultMessage,
              })
              .eq("id", state.matchId);

            if (matchError) throw matchError;

            // --- SAVE CAREER STATS WITH DEBUGGING ---
            if (state.teamIds && state.matchId) {
                console.log("🔍 Fetching Team Links...");
                const { data: teamPlayers } = await supabase
                    .from('team_players')
                    .select('team_id, player_id')
                    .in('team_id', [state.teamIds.batting, state.teamIds.bowling]);

                console.log("🔍 Fetching Innings 1...");
                const { data: inn1 } = await supabase
                    .from('innings')
                    .select('*')
                    .eq('match_id', state.matchId)
                    .eq('innings_number', 1)
                    .single();

                if (teamPlayers && inn1) {
                    console.log("✅ Data Found. Identifying Players...");
                    
                    // Logic: 
                    // Innings 1: 'batting' was P1, 'bowling' was P2
                    // Innings 2: 'batting' is P2, 'bowling' is P1
                    
                    const p1_id = teamPlayers.find(tp => tp.team_id === inn1.batting_team_id)?.player_id;
                    const p2_id = teamPlayers.find(tp => tp.team_id !== inn1.batting_team_id)?.player_id;
                    
                    console.log(`Player 1 ID (Batted 1st): ${p1_id}`);
                    console.log(`Player 2 ID (Batted 2nd): ${p2_id}`);

                    if (p1_id && p2_id) {
                        console.log("💾 Saving Player 1 Stats...");
                        const { error: err1 } = await supabase.from('match_player_stats').insert({
                            match_id: state.matchId,
                            player_id: p1_id,
                            team_id: inn1.batting_team_id,
                            // Batted in Innings 1 (Database)
                            runs_scored: inn1.total_runs,
                            balls_faced: inn1.legal_balls_bowled,
                            is_out: inn1.total_wickets > 0,
                            // Bowled in Innings 2 (Local State)
                            runs_conceded: newTotalRuns,
                            wickets_taken: newTotalWickets,
                            legal_balls_bowled: newLegalBalls
                        });
                        if (err1) console.error("❌ Save P1 Failed:", err1);

                        console.log("💾 Saving Player 2 Stats...");
                        const { error: err2 } = await supabase.from('match_player_stats').insert({
                            match_id: state.matchId,
                            player_id: p2_id,
                            team_id: state.teamIds.batting, // Current Batter
                            // Batted in Innings 2 (Local State)
                            runs_scored: newTotalRuns,
                            balls_faced: newLegalBalls,
                            is_out: newTotalWickets > 0,
                            // Bowled in Innings 1 (Database)
                            runs_conceded: inn1.total_runs,
                            wickets_taken: inn1.total_wickets,
                            legal_balls_bowled: inn1.legal_balls_bowled
                        });
                        if (err2) console.error("❌ Save P2 Failed:", err2);
                    }
                } else {
                    console.error("❌ Failed to find Team Players or Innings 1");
                }
            }
            
            // Only trigger automation if it's NOT a Super Over (Round 101)
            if (state.seasonId && state.roundNumber !== 101) {
              checkAndCreateFinal(state.seasonId);
            }
          }
        } catch (err: any) {
          console.error("Sync Failed FULL ERROR:", JSON.stringify(err, null, 2));
          set({
            totalRuns: state.totalRuns,
            totalWickets: state.totalWickets,
            legalBallsBowled: state.legalBallsBowled,
            ballsHistory: state.ballsHistory,
            inningsStatus: state.inningsStatus,
            error: "Failed to save ball. Please check internet.",
          });
        }
      },

      startSecondInnings: async () => {
        const state = get();
        const supabase = createClient();

        if (state.inningsNumber !== 1 || !state.matchId || !state.teamIds) return;

        try {
          const { data: newInnings, error } = await supabase
            .from("innings")
            .insert({
              match_id: state.matchId,
              innings_number: 2,
              batting_team_id: state.teamIds.bowling,
              total_runs: 0,
              total_wickets: 0,
              legal_balls_bowled: 0,
            })
            .select()
            .single();

          if (error) throw error;

          set({
            inningsId: newInnings.id,
            inningsNumber: 2,
            totalRuns: 0,
            totalWickets: 0,
            legalBallsBowled: 0,
            ballsHistory: [],
            inningsStatus: "active",
            target: state.totalRuns + 1,
            teamIds: { batting: state.teamIds.bowling, bowling: state.teamIds.batting },
            error: null,
          });
        } catch (err) {
          console.error("Failed to start 2nd innings:", err);
          set({ error: "Failed to start 2nd innings" });
        }
      },

      fetchMatchHistory: async () => {
        const { inningsId } = get();
        const supabase = createClient();

        if (!inningsId) return;

        const { data, error } = await supabase
          .from('balls')
          .select('*')
          .eq('innings_id', inningsId)
          .order('ball_index', { ascending: true });

        if (!error && data) {
          const history: BallSchema[] = data.map(b => ({
            id: b.id,
            innings_id: b.innings_id,
            ball_index: b.ball_index,
            runs_batter: b.runs_batter,
            extras: b.extras,
            is_wide: b.is_wide,
            is_no_ball: b.is_no_ball,
            is_wicket: b.is_wicket,
            dismissal_kind: b.dismissal_kind
          }));

          set({ ballsHistory: history });
        }
      },

      undoLastBall: async () => {
        const state = get();
        const lastBall = state.ballsHistory[state.ballsHistory.length - 1];
        const supabase = createClient();

        if (!lastBall || state.inningsStatus === 'completed') return;

        const newHistory = state.ballsHistory.slice(0, -1);
        const newRuns = state.totalRuns - lastBall.runs_batter - lastBall.extras;
        const newWickets = lastBall.is_wicket ? state.totalWickets - 1 : state.totalWickets;
        const isLegal = !lastBall.is_wide && !lastBall.is_no_ball;
        const newLegalBalls = isLegal ? state.legalBallsBowled - 1 : state.legalBallsBowled;

        set({
          totalRuns: newRuns,
          totalWickets: newWickets,
          legalBallsBowled: newLegalBalls,
          ballsHistory: newHistory,
          matchResult: null,
          inningsStatus: 'active'
        });

        try {
          await supabase.from('balls').delete().eq('id', lastBall.id);

          await supabase.from('innings').update({
            total_runs: newRuns,
            total_wickets: newWickets,
            legal_balls_bowled: newLegalBalls,
            is_completed: false
          }).eq('id', state.inningsId);

          if (state.matchResult) {
            await supabase.from('matches').update({
              winner_id: null,
              is_completed: false,
              result_note: null
            }).eq('id', state.matchId);
            
            // Delete stats on undo so we don't duplicate if they win again
            await supabase.from('match_player_stats').delete().eq('match_id', state.matchId);
          }

        } catch (err) {
          console.error("Undo failed", err);
          window.location.reload();
        }
      }
    }),
    { name: "MatchStore" }
  )
);