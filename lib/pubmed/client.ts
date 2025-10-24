import axios from 'axios';
import { Source } from '@/types';

const PUBMED_BASE_URL = process.env.PUBMED_API_BASE || 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

interface PubMedSearchResult {
  idlist: string[];
  count: string;
  retmax: string;
}

interface PubMedArticle {
  uid: string;
  title: string;
  authors: string[];
  pubdate: string;
  source: string;
  abstract?: string;
}

export async function searchPubMed(query: string, maxResults: number = 5): Promise<Source[]> {
  try {
    // Step 1: Search for article IDs
    const searchResponse = await axios.get(`${PUBMED_BASE_URL}/esearch.fcgi`, {
      params: {
        db: 'pubmed',
        term: query,
        retmax: maxResults,
        retmode: 'json',
        sort: 'relevance',
      },
    });

    const searchResult: PubMedSearchResult = searchResponse.data.esearchresult;
    const pmids = searchResult.idlist;

    if (!pmids || pmids.length === 0) {
      return [];
    }

    // Step 2: Fetch article details
    const summaryResponse = await axios.get(`${PUBMED_BASE_URL}/esummary.fcgi`, {
      params: {
        db: 'pubmed',
        id: pmids.join(','),
        retmode: 'json',
      },
    });

    const articles = summaryResponse.data.result;

    // Step 3: Fetch abstracts
    const fetchResponse = await axios.get(`${PUBMED_BASE_URL}/efetch.fcgi`, {
      params: {
        db: 'pubmed',
        id: pmids.join(','),
        retmode: 'xml',
      },
    });

    const sources: Source[] = pmids.map((pmid) => {
      const article = articles[pmid];
      if (!article) return null;

      // Extract abstract from XML (basic parsing)
      const abstractMatch = fetchResponse.data.match(
        new RegExp(`<PMID[^>]*>${pmid}</PMID>.*?<Abstract>(.*?)</Abstract>`, 's')
      );
      const abstract = abstractMatch
        ? abstractMatch[1].replace(/<[^>]+>/g, '').trim()
        : '';

      return {
        type: 'pubmed' as const,
        title: article.title || 'Untitled',
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        snippet: abstract || article.source || '',
        pubmed_id: pmid,
        authors: article.authors?.map((a: any) => a.name) || [],
        publication_date: article.pubdate || '',
        relevance_score: 1.0 - pmids.indexOf(pmid) / pmids.length,
      };
    }).filter((s): s is NonNullable<typeof s> => s !== null) as Source[];

    return sources;
  } catch (error: any) {
    console.error('PubMed API error:', error.message);
    return [];
  }
}

export async function shouldUsePubMed(query: string): Promise<boolean> {
  const medicalKeywords = [
    'disease',
    'treatment',
    'therapy',
    'diagnosis',
    'syndrome',
    'symptom',
    'medication',
    'drug',
    'clinical',
    'patient',
    'medical',
    'health',
    'cancer',
    'diabetes',
    'infection',
    'virus',
    'bacteria',
    'study',
    'research',
    'trial',
  ];

  const lowerQuery = query.toLowerCase();
  return medicalKeywords.some(keyword => lowerQuery.includes(keyword));
}

export function formatPubMedSources(sources: Source[]): string {
  if (sources.length === 0) {
    return '\n\n**Note:** No reliable sources were found from PubMed for this query. The information provided is based on general knowledge and should be verified with a healthcare professional.';
  }

  let formatted = '\n\n**Medical Sources:**\n\n';

  sources.forEach((source, index) => {
    formatted += `${index + 1}. **${source.title}**\n`;
    if (source.authors && source.authors.length > 0) {
      const authorList = source.authors.slice(0, 3).join(', ');
      formatted += `   Authors: ${authorList}${source.authors.length > 3 ? ' et al.' : ''}\n`;
    }
    if (source.publication_date) {
      formatted += `   Published: ${source.publication_date}\n`;
    }
    formatted += `   [PubMed Link](${source.url})\n\n`;
  });

  formatted += '\n**Disclaimer:** This information is for educational purposes only and does not constitute medical advice. Please consult with a qualified healthcare provider for medical decisions.\n';

  return formatted;
}

export async function enrichWithPubMed(
  query: string,
  llmResponse: string
): Promise<{ response: string; sources: Source[] }> {
  const shouldSearch = await shouldUsePubMed(query);

  if (!shouldSearch) {
    return { response: llmResponse, sources: [] };
  }

  console.log('🔬 Searching PubMed for medical sources...');
  const sources = await searchPubMed(query);

  const enrichedResponse = llmResponse + formatPubMedSources(sources);

  return { response: enrichedResponse, sources };
}
