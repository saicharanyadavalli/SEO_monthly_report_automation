export interface SlideDefinition {
  id: string;
  position: number;
  name: string;
  dataSource: 'gsc' | 'ga4' | 'config' | 'pagespeed';
  requiresAI: boolean;
}

export const SLIDE_CATALOG: SlideDefinition[] = [
  { id: 'cover', position: 1, name: 'Cover Slide', dataSource: 'config', requiresAI: false },
  { id: 'traffic_overview', position: 2, name: 'Traffic Overview (Past 6 Months)', dataSource: 'gsc', requiresAI: false },
  { id: '6month_summary', position: 3, name: 'SEO Performance: Past 6 Months', dataSource: 'gsc', requiresAI: true },
  { id: 'monthly_summary', position: 4, name: 'SEO Performance: Monthly Summary', dataSource: 'gsc', requiresAI: true },
  { id: 'content_trending_up', position: 5, name: 'Content Trending Up', dataSource: 'gsc', requiresAI: true },
  { id: 'content_trending_down', position: 6, name: 'Content Trending Down', dataSource: 'gsc', requiresAI: true },
  { id: 'top_queries', position: 7, name: 'Top Queries: Period Overview', dataSource: 'gsc', requiresAI: false },
  { id: 'keyword_table_branded', position: 8, name: 'Top Performing Branded Keywords', dataSource: 'gsc', requiresAI: false },
  { id: 'keyword_analysis_branded', position: 9, name: 'Branded Keywords Analysis', dataSource: 'gsc', requiresAI: true },
  { id: 'keyword_table_nonbranded', position: 10, name: 'Top Performing Non-Branded Keywords', dataSource: 'gsc', requiresAI: false },
  { id: 'keyword_analysis_nonbranded', position: 11, name: 'Non-Branded Keywords Analysis', dataSource: 'gsc', requiresAI: true },
  { id: 'branded_vs_nonbranded', position: 12, name: 'Branded vs Non-Branded Keyword Traffic', dataSource: 'gsc', requiresAI: false },
  { id: 'pages_table_nonblog', position: 13, name: 'Top Performing Pages', dataSource: 'gsc', requiresAI: false },
  { id: 'pages_analysis_nonblog', position: 14, name: 'Pages Analysis', dataSource: 'gsc', requiresAI: true },
  { id: 'pages_table_blog', position: 15, name: 'Top Performing Blog Pages', dataSource: 'gsc', requiresAI: false },
  { id: 'pages_analysis_blog', position: 16, name: 'Blog Pages Analysis', dataSource: 'gsc', requiresAI: true },
  { id: 'channels', position: 17, name: 'Organic Channel Comparison', dataSource: 'ga4', requiresAI: true },
  { id: 'channels_charts', position: 18, name: 'Organic Channel Comparison: Detailed View', dataSource: 'ga4', requiresAI: false },
  { id: 'core_web_vitals', position: 19, name: 'Core Web Vitals', dataSource: 'pagespeed', requiresAI: false },
];
