export type Messages = {
  brand: {
    name: string;
  };
  nav: {
    home: string;
    cars: string;
    favorites: string;
  };
  home: {
    title: string;
    subtitle: string;
    ctaBrowse: string;
    ctaFavorites: string;
  };
  cars: {
    title: string;
    subtitle: string;
    sortLabel: string;
    filterFuel: string;
    filterTransmission: string;
    allOption: string;
    empty: string;
    year: string;
    mileage: string;
    fuel: string;
    transmission: string;
    details: string;
    addFavorite: string;
    removeFavorite: string;
    sortOptions: {
      newest: string;
      priceLowToHigh: string;
      priceHighToLow: string;
      mileageLowToHigh: string;
    };
  };
  favorites: {
    title: string;
    subtitle: string;
    empty: string;
    browseCars: string;
  };
  carDetail: {
    specs: string;
    gallery: string;
    video: string;
    contactNow: string;
    whatsapp: string;
    inquiry: string;
    name: string;
    country: string;
    message: string;
    submit: string;
    placeholderName: string;
    placeholderCountry: string;
    placeholderWhatsapp: string;
    placeholderMessage: string;
  };
};
