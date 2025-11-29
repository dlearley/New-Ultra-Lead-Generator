export const BUSINESS_LEADS_INDEX = 'business_leads';

// Custom analyzers for business name matching and tag analysis
export const customAnalyzers = {
  // Analyzer for business names that handles variations, abbreviations, and legal suffixes
  business_name_analyzer: {
    type: 'custom',
    tokenizer: 'standard',
    filter: [
      'lowercase',
      'stop',
      'stemmer',
      {
        type: 'synonym',
        synonyms: [
          'corporation,corp,corp.,inc,inc.,llc,llc.,ltd,ltd.,co,co. => corporation',
          'company,companies => company',
          'international,intl => international',
          'technologies,tech => technology',
          'systems,sys => system',
          'services,svc => service',
          'associates,assoc => associate',
          'group,grp => group',
          'solutions => solution'
        ]
      },
      {
        type: 'pattern_replace',
        pattern: '[^a-zA-Z0-9\\s]',
        replacement: ''
      }
    ]
  },

  // Analyzer for industry tags and tech stack
  tag_analyzer: {
    type: 'custom',
    tokenizer: 'keyword',
    filter: [
      'lowercase',
      'asciifolding'
    ]
  },

  // Analyzer for text search with stemming
  text_search_analyzer: {
    type: 'custom',
    tokenizer: 'standard',
    filter: [
      'lowercase',
      'stop',
      'stemmer',
      'asciifolding'
    ]
  },

  // Analyzer for autocomplete suggestions
  autocomplete_analyzer: {
    type: 'custom',
    tokenizer: 'edge_ngram',
    filter: [
      'lowercase',
      'asciifolding'
    ]
  }
};

// Tokenizers for edge n-gram autocomplete
export const customTokenizers = {
  edge_ngram: {
    type: 'edge_ngram',
    min_gram: 2,
    max_gram: 20,
    token_chars: ['letter', 'digit']
  }
};

// Business leads index mapping
export const businessLeadsMapping = {
  dynamic: 'strict',
  properties: {
    // Basic identification
    id: {
      type: 'keyword'
    },
    name: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 256
        },
        suggest: {
          type: 'completion',
          analyzer: 'simple'
        },
        autocomplete: {
          type: 'text',
          analyzer: 'autocomplete_analyzer',
          search_analyzer: 'standard'
        }
      }
    },
    canonicalName: {
      type: 'text',
      analyzer: 'business_name_analyzer',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 256
        }
      }
    },
    alternateNames: {
      type: 'text',
      analyzer: 'business_name_analyzer',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 256
        }
      }
    },
    description: {
      type: 'text',
      analyzer: 'text_search_analyzer'
    },
    website: {
      type: 'keyword'
    },
    email: {
      type: 'keyword'
    },
    phone: {
      type: 'keyword'
    },

    // Location information
    address: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword'
        }
      }
    },
    city: {
      type: 'keyword',
      fields: {
        suggest: {
          type: 'completion'
        }
      }
    },
    state: {
      type: 'keyword'
    },
    country: {
      type: 'keyword'
    },
    postalCode: {
      type: 'keyword'
    },
    coordinates: {
      type: 'geo_point'
    },

    // Business classification
    industry: {
      type: 'keyword'
    },
    businessType: {
      type: 'keyword'
    },
    businessMode: {
      type: 'keyword'
    },
    ownership: {
      type: 'keyword'
    },

    // Size metrics
    revenue: {
      type: 'integer'
    },
    revenueBand: {
      type: 'keyword'
    },
    employeeCount: {
      type: 'integer'
    },
    employeeBand: {
      type: 'keyword'
    },

    // Tags and classifications
    techStack: {
      type: 'text',
      analyzer: 'tag_analyzer',
      fields: {
        keyword: {
          type: 'keyword'
        }
      }
    },
    industryTags: {
      type: 'text',
      analyzer: 'tag_analyzer',
      fields: {
        keyword: {
          type: 'keyword'
        }
      }
    },
    specializations: {
      type: 'text',
      analyzer: 'tag_analyzer',
      fields: {
        keyword: {
          type: 'keyword'
        }
      }
    },

    // Metadata
    foundedYear: {
      type: 'integer'
    },
    isVerified: {
      type: 'boolean'
    },
    confidence: {
      type: 'float'
    },

    // Timestamps
    createdAt: {
      type: 'date'
    },
    updatedAt: {
      type: 'date'
    }
  }
};

// Complete index settings with custom analyzers
export const businessLeadsIndexSettings = {
  number_of_shards: 1,
  number_of_replicas: 0,
  analysis: {
    analyzer: customAnalyzers,
    tokenizer: customTokenizers
  }
};

// Complete index definition
export const businessLeadsIndexDefinition = {
  settings: businessLeadsIndexSettings,
  mappings: businessLeadsMapping
};