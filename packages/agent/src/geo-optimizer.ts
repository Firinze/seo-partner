export interface GeoSectionAnalysis {
  heading: string;
  hasDirectAnswer: boolean;
  directAnswerSummary?: string;
  wordCount: number;
}

export interface GeoOptimizationResult {
  score: number; // 0 to 100
  sections: GeoSectionAnalysis[];
  recommendations: string[];
}

export function optimizeForGenerativeEngines(markdownContent: string): GeoOptimizationResult {
  const sections: GeoSectionAnalysis[] = [];
  const lines = markdownContent.split('\n');

  let currentHeading: string | null = null;
  let sectionLines: string[] = [];

  const evaluateSection = (heading: string, contentLines: string[]) => {
    const text = contentLines.join(' ').trim();
    const words = text.split(/\s+/).filter(Boolean);
    const firstParagraph = contentLines.find((l) => l.trim().length > 20) ?? '';
    const firstParaWords = firstParagraph.split(/\s+/).filter(Boolean).length;

    // A direct answer under H2 is typically a concise, factual 30-70 word paragraph
    const hasDirectAnswer = firstParaWords >= 25 && firstParaWords <= 80;

    sections.push({
      heading,
      hasDirectAnswer,
      directAnswerSummary: hasDirectAnswer ? firstParagraph : undefined,
      wordCount: words.length,
    });
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentHeading) {
        evaluateSection(currentHeading, sectionLines);
        sectionLines = [];
      }
      currentHeading = line.replace(/^##\s+/, '').trim();
    } else if (currentHeading) {
      sectionLines.push(line);
    }
  }

  if (currentHeading) {
    evaluateSection(currentHeading, sectionLines);
  }

  const directAnswerCount = sections.filter((s) => s.hasDirectAnswer).length;
  const score = sections.length > 0
    ? Math.round((directAnswerCount / sections.length) * 100)
    : 100;

  const recommendations: string[] = [];
  if (score < 80) {
    recommendations.push(
      'Intégrez un paragraphe de synthèse direct de 40 à 60 mots sous chaque titre H2 pour optimiser la reprise par les moteurs d\'IA (Google AI Overviews, Perplexity).',
    );
  }

  return {
    score,
    sections,
    recommendations,
  };
}

