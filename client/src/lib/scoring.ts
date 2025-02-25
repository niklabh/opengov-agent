import nlp from "compromise";

const SCORING_RULES = {
  COMMUNITY_BENEFIT: 10,
  ECOSYSTEM_GROWTH: 15,
  HIGH_COST: -15,
  TECHNICAL_COMPLEXITY: -5
};

export function analyzeProposal(text: string) {
  const doc = nlp(text);
  let score = 0;
  let analysis = [];

  // Check for community benefits
  if (doc.match('(community|members|users)').found) {
    score += SCORING_RULES.COMMUNITY_BENEFIT;
    analysis.push("Community focused (+10)");
  }

  // Check for ecosystem growth
  if (doc.match('(ecosystem|growth|development|expand)').found) {
    score += SCORING_RULES.ECOSYSTEM_GROWTH;
    analysis.push("Promotes ecosystem growth (+15)");
  }

  // Check for high costs
  if (doc.match('(expensive|costly|high cost|large sum)').found) {
    score += SCORING_RULES.HIGH_COST;
    analysis.push("High cost implications (-15)");
  }

  // Check for technical complexity
  if (doc.match('(complex|difficult|challenging|technical)').found) {
    score += SCORING_RULES.TECHNICAL_COMPLEXITY;
    analysis.push("Technical complexity (-5)");
  }

  return {
    score,
    analysis,
    sentiment: doc.sentiment().score
  };
}
