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
  round_number: number; // Added round_number
  winner_id?: string | null;
  result_note?: string | null;
}

interface MatchState {
  matchId: string | null;
  inningsId: string | null;
  teamIds: TeamIds | null;
  seasonId: string | null;
  roundNumber: number; // Added to track if Super Over

  // Scoring
  totalRuns: number;
  totalWickets: number;
  legalBallsBowled: number;
  ballsHistory: BallSchema[];

  // Game State
  inningsNumber: 1 | 2;
  target: number | null; // Only for 2nd innings
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
const MAX_LEGAL_BALLS_SUPER = 6;    // 1 Over for Super Over (Round 101)
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
          roundNumber: matchData.round_number, // Store round number
          inningsNumber: innings.innings_number,
          totalRuns: innings.total_runs,
          totalWickets: innings.total_wickets,
          legalBallsBowled: innings.legal_balls_bowled,
          ballsHistory: [], // In Phase 4 we will load history here
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
        
        // Determine Max Balls based on Round Type (Super Over = 101)
        // --- GAME LOGIC START ---
        
        // Determine Max Balls
        const maxBalls = state.roundNumber === 101 ? MAX_LEGAL_BALLS_SUPER : MAX_LEGAL_BALLS_REGULAR;
        
        let isOver = newTotalWickets >= MAX_WICKETS || newLegalBalls >= maxBalls;

        let matchFinished = false;
        let winnerId: string | null = null;
        let resultMessage = "";

        // CHECK: Target Chasing (2nd Innings Only)
        if (state.inningsNumber === 2 && state.target) {
          // Case A: Chased successfully
          if (newTotalRuns >= state.target) {
            isOver = true;
            matchFinished = true;
            winnerId = state.teamIds?.batting || null;
            resultMessage = "Chased down successfully!";
          } 
          // Case B: Innings ended (Wicket or Overs)
          else if (isOver) {
            matchFinished = true;
            
            // TIE SCENARIO
            if (newTotalRuns === state.target - 1) {
              winnerId = null; // No winner yet

              // LOGIC FIX: Handle Tie based on Match Type
              if (state.roundNumber < 100) {
                  // LEAGUE MATCH: Just a draw
                  resultMessage = "Match Tied (1 pt each)";
              } else if (state.roundNumber === 100) {
                  // FINAL: Needs Super Over
                  resultMessage = "Match Tied! (Super Over needed)";
              } else if (state.roundNumber === 101) {
                  // SUPER OVER TIED: Needs Bowl Out
                  resultMessage = "Bowl Out Needed!";
              }
            } 
            // DEFENDED SCENARIO
            else {
              winnerId = state.teamIds?.bowling || null;
              resultMessage = "Defended the target!";
            }
          }
        }
        // --- GAME LOGIC END ---
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

          // C. IF MATCH FINISHED: Update Match Table
          if (matchFinished) {
            const { error: matchError } = await supabase
              .from("matches")
              .update({
                winner_id: winnerId,
                is_completed: true,
                result_note: resultMessage,
              })
              .eq("id", state.matchId);

            if (matchError) throw matchError;
            
            // Only trigger automation if it's NOT a Super Over (Round 101)
            // We don't want Super Over completion to trigger a new Final
            if (state.seasonId && state.roundNumber !== 101) {
              checkAndCreateFinal(state.seasonId);
            }
          }
        } catch (err: any) {
          console.error("Sync Failed FULL ERROR:", JSON.stringify(err, null, 2));
          // 6. Rollback on Error
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