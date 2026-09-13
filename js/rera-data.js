// RERA & Infrastructure Data for Stambadri Enclave
const reraData = {
  projectName: 'Stambadri Enclave',
  location: 'Gurralapadu, Khammam–Kodada Highway',
  coordinates: {
    lat: 17.24767,
    lng: 80.14368
  },

  // RERA Registration
  rera: {
    status: 'APPROVED',
    stateName: 'Telangana',
    reraNumber: 'TG/CR/2023/15847',
    registeredWith: 'RERA Authority, Telangana',
    approvalDate: '2023-08-15',
    validTill: '2026-12-31',
    dtcpApprooval: 'TLP No. 239/2023/H',
    dtcpAuthority: 'DTCP, Khammam Municipal Corporation',
    dtcpDate: '2023-06-20'
  },

  // Project Details
  project: {
    totalPlots: 302,
    totalArea: '150 acres',
    plotSizes: ['1800 sqft', '2100 sqft', '2400 sqft', '3000 sqft'],
    developer: 'GV Infra Projects',
    yearStarted: 2023,
    expectedCompletion: 2025,
    plotStatus: {
      available: 28,
      sold: 8,
      reserved: 12,
      onHold: 4,
      blocked: 250
    }
  },

  // Road Network
  roads: [
    {
      name: 'Khammam–Kodada Highway',
      width: '60 ft',
      type: 'NH Highway',
      connectivity: 'Direct access to national highway'
    },
    {
      name: 'Internal BT Road (Main)',
      width: '50 ft',
      type: 'Main road',
      connectivity: 'Connects to NH Highway'
    },
    {
      name: 'Internal BT Roads (Secondary)',
      width: '40 ft',
      type: 'Secondary roads',
      connectivity: 'Community access'
    },
    {
      name: 'Internal BT Roads (Tertiary)',
      width: '30 ft',
      type: 'Tertiary roads',
      connectivity: 'Plot access'
    }
  ],

  // Infrastructure & Amenities
  infrastructure: [
    {
      id: 'park1',
      name: 'Central Green Space - 1',
      type: 'Park',
      area: '8 acres',
      coordinates: [17.2485, 80.1440],
      description: 'Central green park with landscaping',
      amenities: ['Walking track', 'Seating areas', 'Children play area']
    },
    {
      id: 'park2',
      name: 'Central Green Space - 2',
      type: 'Park',
      area: '6 acres',
      coordinates: [17.2468, 80.1435],
      description: 'Secondary green park',
      amenities: ['Jogging track', 'Yoga area', 'Meditation zone']
    },
    {
      id: 'social',
      name: 'Social Infrastructure Plot',
      type: 'Community Center',
      area: '2 acres',
      coordinates: [17.2475, 80.1445],
      description: 'Multi-purpose community building',
      amenities: ['Community hall', 'Health center', 'Educational facility']
    },
    {
      id: 'water',
      name: 'Water Treatment Plant',
      type: 'Utility',
      area: 'Centralized',
      coordinates: [17.2460, 80.1430],
      description: '24/7 water supply system',
      specs: 'Borewell + UGR tank'
    },
    {
      id: 'power',
      name: 'Power Distribution',
      type: 'Utility',
      area: 'Network',
      coordinates: [17.2470, 80.1438],
      description: 'Dedicated transformer + cables',
      specs: 'Individual meters per plot'
    },
    {
      id: 'security',
      name: 'Security Gate',
      type: 'Gated Community',
      area: 'Main entrance',
      coordinates: [17.2490, 80.1450],
      description: 'Gated community entrance',
      specs: '24/7 security, vehicle access control'
    }
  ],

  // Nearby Facilities (External)
  nearbyFacilities: [
    {
      name: 'Khammam City Hospital',
      type: 'Hospital',
      distance: '8 km',
      coordinates: [17.3668, 80.1398]
    },
    {
      name: 'Government School',
      type: 'School',
      distance: '3 km',
      coordinates: [17.2300, 80.1500]
    },
    {
      name: 'Khammam Railway Station',
      type: 'Transport',
      distance: '15 km',
      coordinates: [17.3695, 80.1489]
    },
    {
      name: 'Khammam Bus Stand',
      type: 'Transport',
      distance: '12 km',
      coordinates: [17.3720, 80.1461]
    },
    {
      name: 'Shopping Complex',
      type: 'Retail',
      distance: '5 km',
      coordinates: [17.2600, 80.1300]
    }
  ],

  // Pricing
  pricing: {
    basePricePerSqft: 9000,
    priceRange: {
      min: '₹1.62 Crore (1800 sqft)',
      max: '₹2.70 Crore (3000 sqft)'
    },
    registrationCharges: '4-5% of property value',
    bankLoans: 'Available through partner banks (80% LTV)',
    loanPeriod: '15-20 years'
  },

  // Legal & Documentation
  legal: {
    landOwnership: 'Freehold',
    buildingApproval: 'Approved',
    environmentalClearance: 'Not Required (Open plot)',
    waterRights: 'Included',
    electricityRights: 'Included',
    documentationTime: '7-10 days after full payment'
  },

  // Vastu & Facing
  vastu: {
    northFacing: 'Most auspicious (Vastu)',
    eastFacing: 'Auspicious',
    westFacing: 'Balanced',
    southFacing: 'Requires remedies (optional)',
    disclaimer: 'Indicative only - Vastu is a matter of personal belief and practice'
  },

  // Contact Information
  contact: {
    khammamOffice: {
      name: 'Khammam Office',
      address: 'Star Complex, 5th Floor #501, Opp. HP Petrol Bunk, Raparthi Nagar, Khammam – 507002',
      phone: '+91 9000 0000 00',
      hours: 'Mon–Sat, 9:30 AM – 6:30 PM'
    },
    hyderabadOffice: {
      name: 'Hyderabad Head Office',
      address: '#5-5-140/1, 1st Floor, Nustar Bhavan, Opp. Mangalya Shopping Mall, Vanastalipuram, Hyderabad – 500070',
      phone: '+91 9000 0000 00',
      hours: 'Mon–Fri, 10:00 AM – 6:00 PM'
    }
  },

  // Important Notes
  notes: {
    disclaimer: 'This project uses illustrative layouts and generated data for demonstration purposes.',
    surveyStatus: 'Actual surveyed boundaries not yet confirmed',
    satelliteImagery: 'Regional imagery - exact boundary not marked on satellite view',
    documentation: 'All legal documents available for verification at site office'
  }
};

// Function to get RERA display panel HTML
function getReraPanel() {
  return `
    <div class="rera-panel">
      <div class="rera-header">
        <h3>RERA & Project Information</h3>
        <span class="rera-status approved">✓ RERA Approved</span>
      </div>

      <div class="rera-content">
        <div class="info-section">
          <h4>RERA Registration</h4>
          <p><strong>Reg Number:</strong> ${reraData.rera.reraNumber}</p>
          <p><strong>Authority:</strong> ${reraData.rera.registeredWith}</p>
          <p><strong>Valid Till:</strong> ${reraData.rera.validTill}</p>
        </div>

        <div class="info-section">
          <h4>DTCP Approval</h4>
          <p><strong>Approval Number:</strong> ${reraData.rera.dtcpApprooval}</p>
          <p><strong>Date:</strong> ${reraData.rera.dtcpDate}</p>
        </div>

        <div class="info-section">
          <h4>Project Overview</h4>
          <p><strong>Total Plots:</strong> ${reraData.project.totalPlots}</p>
          <p><strong>Total Area:</strong> ${reraData.project.totalArea}</p>
          <p><strong>Developer:</strong> ${reraData.project.developer}</p>
        </div>

        <div class="info-section">
          <h4>Current Inventory</h4>
          <div class="inventory-stats">
            <div class="stat available">
              <span class="count">${reraData.project.plotStatus.available}</span>
              <span class="label">Available</span>
            </div>
            <div class="stat reserved">
              <span class="count">${reraData.project.plotStatus.reserved}</span>
              <span class="label">Reserved</span>
            </div>
            <div class="stat sold">
              <span class="count">${reraData.project.plotStatus.sold}</span>
              <span class="label">Sold</span>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>Contact</h4>
          <p><strong>Khammam Office:</strong> ${reraData.contact.khammamOffice.phone}</p>
          <p><strong>Hours:</strong> ${reraData.contact.khammamOffice.hours}</p>
        </div>
      </div>
    </div>
  `;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { reraData, getReraPanel };
}
