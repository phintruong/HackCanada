export const mockHospitals = [
    {
        id: "h1",
        name: "Toronto General Hospital",
        city: "toronto",
        lat: 43.6588,
        lng: -79.3888,
        erBeds: 50,
        totalBeds: 471,
        phone: "416-340-3111"
    },
    {
        id: "h2",
        name: "Mount Sinai Hospital",
        city: "toronto",
        lat: 43.6576,
        lng: -79.3905,
        erBeds: 30,
        totalBeds: 442,
        phone: "416-596-4200"
    },
    {
        id: "h3",
        name: "Trillium Health Partners - Mississauga Hospital",
        city: "mississauga",
        lat: 43.5724,
        lng: -79.6053,
        erBeds: 60,
        totalBeds: 751,
        phone: "905-848-7100"
    },
    {
        id: "h4",
        name: "Credit Valley Hospital",
        city: "mississauga",
        lat: 43.5615,
        lng: -79.7042,
        erBeds: 55,
        totalBeds: 382,
        phone: "905-813-2200"
    },
    {
        id: "h5",
        name: "Grand River Hospital",
        city: "waterloo",
        lat: 43.4566,
        lng: -80.5050,
        erBeds: 40,
        totalBeds: 574,
        phone: "519-742-3611"
    },
    {
        id: "h6",
        name: "St. Mary's General Hospital",
        city: "waterloo",
        lat: 43.4357,
        lng: -80.4905,
        erBeds: 35,
        totalBeds: 153,
        phone: "519-744-3311"
    }
];

export const mockCongestion = [
    {
        hospitalId: "h1",
        timestamp: new Date().toISOString(),
        liveWaitTime: 4.5, // hours
        baselineWaitTime: 3.2,
        mergedCongestionScore: 8 // out of 10
    },
    {
        hospitalId: "h2",
        timestamp: new Date().toISOString(),
        liveWaitTime: 2.1,
        baselineWaitTime: 2.5,
        mergedCongestionScore: 4
    },
    {
        hospitalId: "h3",
        timestamp: new Date().toISOString(),
        liveWaitTime: 6.2,
        baselineWaitTime: 4.5,
        mergedCongestionScore: 9
    },
    {
        hospitalId: "h4",
        timestamp: new Date().toISOString(),
        liveWaitTime: 3.0,
        baselineWaitTime: 3.5,
        mergedCongestionScore: 5
    },
    {
        hospitalId: "h5",
        timestamp: new Date().toISOString(),
        liveWaitTime: 5.5,
        baselineWaitTime: 4.0,
        mergedCongestionScore: 7
    },
    {
        hospitalId: "h6",
        timestamp: new Date().toISOString(),
        liveWaitTime: 1.5,
        baselineWaitTime: 2.0,
        mergedCongestionScore: 2
    }
];
