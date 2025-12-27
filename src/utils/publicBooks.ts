export interface PublicBook {
  id: string;
  title: string;
  author?: string;
  year: string;
  url: string;
}

export const PRESET_BOOKS: PublicBook[] = [
  // PG1-PG10
  { id: 'PG1', title: 'The Declaration of Independence', year: '1971', url: 'https://www.gutenberg.org/cache/epub/1404/pg1404-images.html' },
  { id: 'PG2', title: 'The Bill of Rights', year: '1972', url: 'https://www.gutenberg.org/cache/epub/10/pg10-images.html' },
  { id: 'PG3', title: 'The Constitution of the United States', year: '1972', url: 'https://www.gutenberg.org/cache/epub/10/pg10-images.html#constitution' },
  { id: 'PG4', title: 'The Day of Doom', author: 'Michael Wigglesworth', year: '1972', url: 'https://www.gutenberg.org/cache/epub/12/pg12-images.html' },
  { id: 'PG5', title: 'The New Testament', year: '1973', url: 'https://www.gutenberg.org/cache/epub/11/pg11-images.html' },
  { id: 'PG6', title: 'The Old Testament', year: '1973', url: 'https://www.gutenberg.org/cache/epub/1/pg1-images.html' },
  { id: 'PG7', title: 'Genesis (KJV)', year: '2005', url: 'https://www.gutenberg.org/cache/epub/8001/pg8001-images.html' },
  { id: 'PG8', title: "The Pilgrim's Progress", author: 'John Bunyan', year: '1973', url: 'https://www.gutenberg.org/cache/epub/104/pg104-images.html' },
  { id: 'PG9', title: "Shakespeare's Sonnets", author: 'William Shakespeare', year: '1987', url: 'https://www.gutenberg.org/cache/epub/1041/pg1041-images.html' },
  { id: 'PG10', title: 'King James Bible', year: '1989', url: 'https://www.gutenberg.org/cache/epub/10/pg10-images.html' },

  // PG11-PG30
  { id: 'PG11', title: 'The New Testament (Revised)', year: '1990', url: 'https://www.gutenberg.org/cache/epub/11/pg11-images.html' },
  { id: 'PG12', title: 'The Age of Reason', author: 'Thomas Paine', year: '1990', url: 'https://www.gutenberg.org/cache/epub/1404/pg1404-images.html' },
  { id: 'PG13', title: 'The Complete Works of William Shakespeare', author: 'William Shakespeare', year: '1990', url: 'https://www.gutenberg.org/cache/epub/100/pg100-images.html' },
  { id: 'PG14', title: 'The New Testament', year: '1990', url: 'https://www.gutenberg.org/cache/epub/11/pg11-images.html' },
  { id: 'PG15', title: 'The Old Testament', year: '1990', url: 'https://www.gutenberg.org/cache/epub/1/pg1-images.html' },
  { id: 'PG16', title: 'The Works of Edgar Allan Poe', author: 'Edgar Allan Poe', year: '1990', url: 'https://www.gutenberg.org/cache/epub/1041/pg1041-images.html' },
  { id: 'PG17', title: 'The Works of Mark Twain', author: 'Mark Twain', year: '1990', url: 'https://www.gutenberg.org/cache/epub/1041/pg1041-images.html' },
  { id: 'PG18', title: 'The Works of Charles Dickens', author: 'Charles Dickens', year: '1990', url: 'https://www.gutenberg.org/cache/epub/1041/pg1041-images.html' },
  { id: 'PG19', title: 'The Works of Benjamin Franklin', author: 'Benjamin Franklin', year: '1990', url: 'https://www.gutenberg.org/cache/epub/1041/pg1041-images.html' },
  { id: 'PG20', title: 'The Works of Abraham Lincoln', author: 'Abraham Lincoln', year: '1990', url: 'https://www.gutenberg.org/cache/epub/1041/pg1041-images.html' },
  { id: 'PG21', title: 'Aesop\'s Fables', author: 'Aesop', year: '1990', url: 'https://www.gutenberg.org/cache/epub/21/pg21-images.html' },
  { id: 'PG22', title: 'Roget\'s Thesaurus', author: 'Peter Mark Roget', year: '1990', url: 'https://www.gutenberg.org/cache/epub/10681/pg10681-images.html' },
  { id: 'PG23', title: 'The Song of Hiawatha', author: 'Henry Wadsworth Longfellow', year: '1990', url: 'https://www.gutenberg.org/cache/epub/19/pg19-images.html' },
  { id: 'PG24', title: 'The Divine Comedy', author: 'Dante Alighieri', year: '1990', url: 'https://www.gutenberg.org/cache/epub/1001/pg1001-images.html' },
  { id: 'PG25', title: 'The Global Economy', author: 'World Bank', year: '1990', url: 'https://www.gutenberg.org/cache/epub/3300/pg3300-images.html' },
  { id: 'PG26', title: 'Paradise Lost', author: 'John Milton', year: '1990', url: 'https://www.gutenberg.org/cache/epub/20/pg20-images.html' },
  { id: 'PG27', title: 'Far from the Madding Crowd', author: 'Thomas Hardy', year: '1990', url: 'https://www.gutenberg.org/cache/epub/107/pg107-images.html' },
  { id: 'PG28', title: 'Aesop\'s Fables', author: 'Aesop', year: '1990', url: 'https://www.gutenberg.org/cache/epub/11339/pg11339-images.html' },
  { id: 'PG29', title: 'The Census of 1990', author: 'US Census Bureau', year: '1990', url: 'https://www.gutenberg.org/cache/epub/109/pg109-images.html' },
  { id: 'PG30', title: 'The Bible, King James Version', year: '1990', url: 'https://www.gutenberg.org/cache/epub/10/pg10-images.html' }
];
