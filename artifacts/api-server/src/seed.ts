import bcrypt from "bcryptjs";
import { db, usersTable, propertiesTable } from "@workspace/db";
import { eq, like, or } from "drizzle-orm";
import { logger } from "./lib/logger";

const ADMIN_EMAIL = "admin@app.meridianflow.site";
const ADMIN_PASSWORD = "Admin@61661248";

export async function seedAdmin(): Promise<void> {
  try {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, ADMIN_EMAIL));

    if (existing) {
      logger.info("Admin account already exists, skipping seed");
      return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await db.insert(usersTable).values({
      firstName: "Admin",
      middleName: "",
      surname: "User",
      phone: "00000000000",
      whatsappNumber: "00000000000",
      username: "admin",
      email: ADMIN_EMAIL,
      passwordHash,
      gender: "male",
      avatar: "",
      homeAddress: "",
      bankName: "",
      accountNumber: "",
      accountHolderName: "",
      zipCode: "",
      referralCode: "ADMINROOT",
      referredBy: "",
      role: "admin",
      isActive: true,
      balance: "0",
      securityDeposit: "0",
      position: "",
      level: "",
      activatedLevels: "[]",
    });

    logger.info("Admin account created successfully");
  } catch (err) {
    logger.error({ err }, "Failed to seed admin account");
  }
}

const WORLDWIDE_PROPERTIES = [
  { propertyName: "Manhattan Sky Penthouse", propertyType: "Penthouse", location: "5th Avenue, New York, USA", reward: "1219.08", imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80" },
  { propertyName: "Beverly Hills Grand Villa", propertyType: "Villa", location: "Rodeo Drive, Beverly Hills, USA", reward: "1350.50", imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80" },
  { propertyName: "Miami Beachfront Condo", propertyType: "Condo", location: "Ocean Drive, South Beach, Miami, USA", reward: "980.75", imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80" },
  { propertyName: "Chicago Lakefront Tower", propertyType: "Apartment", location: "Lake Shore Drive, Chicago, USA", reward: "1100.25", imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80" },
  { propertyName: "San Francisco Bay View", propertyType: "Apartment", location: "Financial District, San Francisco, USA", reward: "850.00", imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80" },
  { propertyName: "Las Vegas Luxury Suite", propertyType: "Suite", location: "The Strip, Las Vegas, Nevada, USA", reward: "920.50", imageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80" },
  { propertyName: "Boston Heritage Townhouse", propertyType: "Residence", location: "Beacon Hill, Boston, USA", reward: "1500.00", imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80" },
  { propertyName: "Seattle Waterfront Loft", propertyType: "Loft", location: "Pike Place, Seattle, Washington, USA", reward: "2100.00", imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80" },
  { propertyName: "Austin Tech District Studio", propertyType: "Studio", location: "South Congress, Austin, Texas, USA", reward: "1050.00", imageUrl: "https://images.unsplash.com/photo-1633363994090-4587b69e7775?w=400&q=80" },
  { propertyName: "Houston Energy Corridor", propertyType: "Commercial", location: "Galleria District, Houston, Texas, USA", reward: "1800.00", imageUrl: "https://images.unsplash.com/photo-1504615755583-2916b52192a3?w=400&q=80" },
  { propertyName: "Kensington Royal Mansion", propertyType: "Mansion", location: "Kensington Palace Gardens, London, UK", reward: "1200.00", imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80" },
  { propertyName: "Canary Wharf Executive Suite", propertyType: "Suite", location: "One Canada Square, London, UK", reward: "750.00", imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80" },
  { propertyName: "Mayfair Heritage Townhouse", propertyType: "Residence", location: "Berkeley Square, Mayfair, London, UK", reward: "680.00", imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80" },
  { propertyName: "Paris Champs-Élysées Apt", propertyType: "Apartment", location: "Avenue des Champs-Élysées, Paris, France", reward: "820.00", imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80" },
  { propertyName: "Monaco Harbour Penthouse", propertyType: "Penthouse", location: "Port Hercule, Monte Carlo, Monaco", reward: "700.00", imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80" },
  { propertyName: "Swiss Alps Chalet", propertyType: "Villa", location: "Interlaken, Bern, Switzerland", reward: "760.00", imageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80" },
  { propertyName: "Barcelona Gothic Quarter", propertyType: "Apartment", location: "Las Ramblas, Barcelona, Spain", reward: "640.00", imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80" },
  { propertyName: "Amsterdam Canal House", propertyType: "Residence", location: "Herengracht, Amsterdam, Netherlands", reward: "590.00", imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80" },
  { propertyName: "Rome Colosseum View", propertyType: "Apartment", location: "Via Sacra, Rome, Italy", reward: "2500.00", imageUrl: "https://images.unsplash.com/photo-1633363994090-4587b69e7775?w=400&q=80" },
  { propertyName: "Vienna Imperial Apartment", propertyType: "Apartment", location: "Ringstrasse, Vienna, Austria", reward: "1650.00", imageUrl: "https://images.unsplash.com/photo-1504615755583-2916b52192a3?w=400&q=80" },
  { propertyName: "Dubai Marina Skytower", propertyType: "Apartment", location: "Dubai Marina Walk, Dubai, UAE", reward: "580.00", imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80" },
  { propertyName: "Burj Khalifa Residences", propertyType: "Penthouse", location: "Downtown Dubai, Dubai, UAE", reward: "450.00", imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80" },
  { propertyName: "Palm Jumeirah Grand Villa", propertyType: "Villa", location: "Palm Jumeirah, Dubai, UAE", reward: "420.00", imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80" },
  { propertyName: "Abu Dhabi Corniche Apt", propertyType: "Apartment", location: "Corniche Road, Abu Dhabi, UAE", reward: "620.00", imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80" },
  { propertyName: "Doha Pearl Waterfront", propertyType: "Condo", location: "The Pearl Qatar, Doha, Qatar", reward: "680.00", imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80" },
  { propertyName: "Riyadh Kingdom Tower", propertyType: "Commercial", location: "King Fahd Road, Riyadh, Saudi Arabia", reward: "720.00", imageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80" },
  { propertyName: "Beirut Skyline Residence", propertyType: "Residence", location: "Achrafieh, Beirut, Lebanon", reward: "650.00", imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80" },
  { propertyName: "Kuwait City Marina Apt", propertyType: "Apartment", location: "Marina Crescent, Kuwait City, Kuwait", reward: "480.00", imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80" },
  { propertyName: "Muscat Sea View Villa", propertyType: "Villa", location: "Qurum Beach, Muscat, Oman", reward: "440.00", imageUrl: "https://images.unsplash.com/photo-1633363994090-4587b69e7775?w=400&q=80" },
  { propertyName: "Bahrain Financial Harbour", propertyType: "Commercial", location: "Diplomatic Area, Manama, Bahrain", reward: "460.00", imageUrl: "https://images.unsplash.com/photo-1504615755583-2916b52192a3?w=400&q=80" },
  { propertyName: "Singapore Marina Bay Suite", propertyType: "Suite", location: "Marina Bay Sands, Singapore", reward: "620.00", imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80" },
  { propertyName: "Tokyo Shibuya Tower", propertyType: "Apartment", location: "Shibuya Crossing, Tokyo, Japan", reward: "410.00", imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80" },
  { propertyName: "Hong Kong Harbour View", propertyType: "Penthouse", location: "Victoria Harbour, Hong Kong", reward: "390.00", imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80" },
  { propertyName: "Shanghai Bund Residence", propertyType: "Apartment", location: "The Bund, Shanghai, China", reward: "370.00", imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80" },
  { propertyName: "Sydney Harbour Bridge View", propertyType: "Apartment", location: "Circular Quay, Sydney, Australia", reward: "360.00", imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80" },
  { propertyName: "Melbourne Docklands Loft", propertyType: "Loft", location: "Docklands District, Melbourne, Australia", reward: "340.00", imageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80" },
  { propertyName: "Bali Clifftop Villa", propertyType: "Villa", location: "Uluwatu Cliff, Bali, Indonesia", reward: "330.00", imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80" },
  { propertyName: "Bangkok Sukhumvit Condo", propertyType: "Condo", location: "Sukhumvit Road, Bangkok, Thailand", reward: "320.00", imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80" },
  { propertyName: "Seoul Gangnam Heights", propertyType: "Apartment", location: "Gangnam District, Seoul, South Korea", reward: "310.00", imageUrl: "https://images.unsplash.com/photo-1633363994090-4587b69e7775?w=400&q=80" },
  { propertyName: "Kuala Lumpur KLCC Tower", propertyType: "Apartment", location: "KLCC Park, Kuala Lumpur, Malaysia", reward: "300.00", imageUrl: "https://images.unsplash.com/photo-1504615755583-2916b52192a3?w=400&q=80" },
  { propertyName: "Toronto Harbourfront Condo", propertyType: "Condo", location: "Queens Quay, Toronto, Canada", reward: "560.00", imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80" },
  { propertyName: "Vancouver Waterfront Penthouse", propertyType: "Penthouse", location: "Coal Harbour, Vancouver, Canada", reward: "290.00", imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80" },
  { propertyName: "São Paulo Jardins Mansion", propertyType: "Mansion", location: "Rua Oscar Freire, São Paulo, Brazil", reward: "480.00", imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80" },
  { propertyName: "Buenos Aires Palermo Apt", propertyType: "Apartment", location: "Palermo Soho, Buenos Aires, Argentina", reward: "270.00", imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80" },
  { propertyName: "Cape Town Clifton Villa", propertyType: "Villa", location: "Clifton Beach, Cape Town, South Africa", reward: "260.00", imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80" },
  { propertyName: "Johannesburg Sandton Tower", propertyType: "Commercial", location: "Sandton City, Johannesburg, South Africa", reward: "250.00", imageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80" },
  { propertyName: "Mumbai Bandra Sea View", propertyType: "Apartment", location: "Carter Road, Bandra, Mumbai, India", reward: "280.00", imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80" },
  { propertyName: "New Delhi Lutyens Bungalow", propertyType: "Residence", location: "Lutyens' Delhi, New Delhi, India", reward: "240.00", imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80" },
  { propertyName: "Nairobi Lavington Estate", propertyType: "Estate", location: "Lavington Green, Nairobi, Kenya", reward: "230.00", imageUrl: "https://images.unsplash.com/photo-1633363994090-4587b69e7775?w=400&q=80" },
  { propertyName: "Cairo Zamalek Apartment", propertyType: "Apartment", location: "Zamalek Island, Cairo, Egypt", reward: "220.00", imageUrl: "https://images.unsplash.com/photo-1504615755583-2916b52192a3?w=400&q=80" },
  { propertyName: "Malibu Ocean Villa", propertyType: "Villa", location: "Pacific Coast Hwy, Malibu, California, USA", reward: "1219.08", imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80" },
  { propertyName: "Aspen Mountain Chalet", propertyType: "Villa", location: "Durant Avenue, Aspen, Colorado, USA", reward: "1350.50", imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80" },
  { propertyName: "Honolulu Beachfront Suite", propertyType: "Suite", location: "Kalakaua Avenue, Honolulu, Hawaii, USA", reward: "980.75", imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80" },
  { propertyName: "New Orleans Garden District", propertyType: "Residence", location: "St Charles Avenue, New Orleans, USA", reward: "1100.25", imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80" },
  { propertyName: "Washington DC Capitol View", propertyType: "Apartment", location: "Pennsylvania Avenue, Washington DC, USA", reward: "850.00", imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80" },
  { propertyName: "Denver Rocky Mountain Loft", propertyType: "Loft", location: "LoDo District, Denver, Colorado, USA", reward: "920.50", imageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80" },
  { propertyName: "Nashville Music Row Condo", propertyType: "Condo", location: "Music Row, Nashville, Tennessee, USA", reward: "1500.00", imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80" },
  { propertyName: "Portland Pearl District", propertyType: "Apartment", location: "Pearl District, Portland, Oregon, USA", reward: "2100.00", imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80" },
  { propertyName: "Phoenix Scottsdale Resort", propertyType: "Resort", location: "Scottsdale Road, Phoenix, Arizona, USA", reward: "1050.00", imageUrl: "https://images.unsplash.com/photo-1633363994090-4587b69e7775?w=400&q=80" },
  { propertyName: "Atlanta Buckhead Mansion", propertyType: "Mansion", location: "Buckhead District, Atlanta, Georgia, USA", reward: "1800.00", imageUrl: "https://images.unsplash.com/photo-1504615755583-2916b52192a3?w=400&q=80" },
  { propertyName: "Lisbon Alfama View Apt", propertyType: "Apartment", location: "Alfama District, Lisbon, Portugal", reward: "1200.00", imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80" },
  { propertyName: "Madrid Salamanca Residence", propertyType: "Residence", location: "Barrio de Salamanca, Madrid, Spain", reward: "750.00", imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80" },
  { propertyName: "Milan Fashion District Apt", propertyType: "Apartment", location: "Quadrilatero della Moda, Milan, Italy", reward: "680.00", imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80" },
  { propertyName: "Prague Old Town Flat", propertyType: "Apartment", location: "Old Town Square, Prague, Czech Republic", reward: "820.00", imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80" },
  { propertyName: "Budapest Danube View", propertyType: "Apartment", location: "Buda Castle District, Budapest, Hungary", reward: "700.00", imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80" },
  { propertyName: "Santorini Caldera Villa", propertyType: "Villa", location: "Oia Village, Santorini, Greece", reward: "760.00", imageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80" },
  { propertyName: "Copenhagen Harbour Loft", propertyType: "Loft", location: "Nyhavn District, Copenhagen, Denmark", reward: "640.00", imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80" },
  { propertyName: "Stockholm Gamla Stan Apt", propertyType: "Apartment", location: "Gamla Stan, Stockholm, Sweden", reward: "590.00", imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80" },
  { propertyName: "Dublin Ballsbridge Estate", propertyType: "Estate", location: "Ballsbridge, Dublin, Ireland", reward: "2500.00", imageUrl: "https://images.unsplash.com/photo-1633363994090-4587b69e7775?w=400&q=80" },
  { propertyName: "Edinburgh New Town House", propertyType: "Residence", location: "Princes Street, Edinburgh, Scotland", reward: "1650.00", imageUrl: "https://images.unsplash.com/photo-1504615755583-2916b52192a3?w=400&q=80" },
  { propertyName: "Maldives Overwater Villa", propertyType: "Villa", location: "North Malé Atoll, Maldives", reward: "580.00", imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80" },
  { propertyName: "Phuket Hillside Retreat", propertyType: "Villa", location: "Kata Noi, Phuket, Thailand", reward: "450.00", imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80" },
  { propertyName: "Manila BGC Tower", propertyType: "Apartment", location: "Bonifacio Global City, Manila, Philippines", reward: "420.00", imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80" },
  { propertyName: "Jakarta Sudirman Apt", propertyType: "Apartment", location: "Jl. Sudirman, Jakarta, Indonesia", reward: "620.00", imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80" },
  { propertyName: "Ho Chi Minh City Penthouse", propertyType: "Penthouse", location: "District 1, Ho Chi Minh City, Vietnam", reward: "680.00", imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80" },
  { propertyName: "Auckland Harbour Condo", propertyType: "Condo", location: "Viaduct Harbour, Auckland, New Zealand", reward: "720.00", imageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80" },
  { propertyName: "Perth Cottesloe Beach", propertyType: "Residence", location: "Cottesloe Beach, Perth, Australia", reward: "650.00", imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80" },
  { propertyName: "Gold Coast Surfers Paradise", propertyType: "Apartment", location: "Surfers Paradise Blvd, Queensland, Australia", reward: "480.00", imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80" },
  { propertyName: "Taipei 101 District", propertyType: "Apartment", location: "Xinyi District, Taipei, Taiwan", reward: "440.00", imageUrl: "https://images.unsplash.com/photo-1633363994090-4587b69e7775?w=400&q=80" },
  { propertyName: "Osaka Namba Residence", propertyType: "Residence", location: "Namba, Osaka, Japan", reward: "460.00", imageUrl: "https://images.unsplash.com/photo-1504615755583-2916b52192a3?w=400&q=80" },
  { propertyName: "Dubai Creek Harbour", propertyType: "Apartment", location: "Dubai Creek, Dubai, UAE", reward: "620.00", imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80" },
  { propertyName: "Marrakech Medina Riad", propertyType: "Villa", location: "Jemaa el-Fna, Marrakech, Morocco", reward: "410.00", imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80" },
  { propertyName: "Accra Airport Residential", propertyType: "Residence", location: "Airport Ridge, Accra, Ghana", reward: "390.00", imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80" },
  { propertyName: "Kigali Convention District", propertyType: "Commercial", location: "Kigali City Center, Kigali, Rwanda", reward: "370.00", imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80" },
  { propertyName: "Tel Aviv Seafront Apt", propertyType: "Apartment", location: "Herbert Samuel Promenade, Tel Aviv, Israel", reward: "360.00", imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80" },
  { propertyName: "Tbilisi Old Quarter House", propertyType: "Residence", location: "Old Tbilisi, Tbilisi, Georgia", reward: "340.00", imageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80" },
  { propertyName: "Almaty Medeu Heights", propertyType: "Apartment", location: "Medeu District, Almaty, Kazakhstan", reward: "330.00", imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80" },
  { propertyName: "Tashkent Yunusabad Tower", propertyType: "Apartment", location: "Yunusabad, Tashkent, Uzbekistan", reward: "320.00", imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80" },
  { propertyName: "Colombo Cinnamon Gardens", propertyType: "Apartment", location: "Cinnamon Gardens, Colombo, Sri Lanka", reward: "310.00", imageUrl: "https://images.unsplash.com/photo-1633363994090-4587b69e7775?w=400&q=80" },
  { propertyName: "Dhaka Gulshan Residence", propertyType: "Residence", location: "Gulshan 2, Dhaka, Bangladesh", reward: "300.00", imageUrl: "https://images.unsplash.com/photo-1504615755583-2916b52192a3?w=400&q=80" },
  { propertyName: "Mexico City Polanco Villa", propertyType: "Villa", location: "Polanco, Mexico City, Mexico", reward: "560.00", imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80" },
  { propertyName: "Cancún Beachfront Resort", propertyType: "Resort", location: "Hotel Zone, Cancún, Mexico", reward: "290.00", imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80" },
  { propertyName: "Lima Miraflores Condo", propertyType: "Condo", location: "Miraflores District, Lima, Peru", reward: "480.00", imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80" },
  { propertyName: "Bogotá Chapinero Heights", propertyType: "Apartment", location: "Chapinero, Bogotá, Colombia", reward: "270.00", imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80" },
  { propertyName: "Santiago Las Condes Tower", propertyType: "Apartment", location: "Las Condes, Santiago, Chile", reward: "260.00", imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80" },
  { propertyName: "Montevideo Pocitos Apt", propertyType: "Apartment", location: "Pocitos, Montevideo, Uruguay", reward: "250.00", imageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80" },
  { propertyName: "Panama City Financial Dist", propertyType: "Commercial", location: "Punta Pacifica, Panama City, Panama", reward: "280.00", imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80" },
  { propertyName: "Miami Brickell Penthouse", propertyType: "Penthouse", location: "Brickell Key, Miami, Florida, USA", reward: "240.00", imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80" },
  { propertyName: "Montreal Old Port Loft", propertyType: "Loft", location: "Old Montreal, Montreal, Canada", reward: "230.00", imageUrl: "https://images.unsplash.com/photo-1633363994090-4587b69e7775?w=400&q=80" },
  { propertyName: "Calgary Eau Claire Estate", propertyType: "Estate", location: "Eau Claire, Calgary, Alberta, Canada", reward: "220.00", imageUrl: "https://images.unsplash.com/photo-1504615755583-2916b52192a3?w=400&q=80" },
];

const LUXURY_QUEST_ITEMS = [
  // ── Diamonds ──────────────────────────────────────────────────────────────
  { propertyName: "Brilliant-Cut Diamond Collection", propertyType: "Diamond", location: "Antwerp Diamond District, Belgium", reward: "1200.00", imageUrl: "/assets/quests/diamond-collection.png" },
  { propertyName: "Premium Diamond Investment Portfolio", propertyType: "Diamond", location: "Hatton Garden, London, UK", reward: "1350.00", imageUrl: "/assets/quests/diamond-collection.png" },
  { propertyName: "Certified D-Flawless Diamond Set", propertyType: "Diamond", location: "47th Street Diamond Row, New York, USA", reward: "1500.00", imageUrl: "/assets/quests/diamond-collection.png" },
  { propertyName: "Diamond Solitaire Engagement Ring", propertyType: "Diamond", location: "Place Vendôme, Paris, France", reward: "980.00", imageUrl: "/assets/quests/diamond-ring.png" },
  { propertyName: "Round Brilliant Diamond Ring — 3ct", propertyType: "Diamond", location: "Via Condotti, Rome, Italy", reward: "1100.00", imageUrl: "/assets/quests/diamond-ring.png" },
  { propertyName: "Princess-Cut Diamond Solitaire", propertyType: "Diamond", location: "Ginza Jewellery Quarter, Tokyo, Japan", reward: "870.00", imageUrl: "/assets/quests/diamond-ring.png" },
  { propertyName: "Diamond Tennis Necklace — 10ct", propertyType: "Diamond", location: "Rodeo Drive, Beverly Hills, USA", reward: "1650.00", imageUrl: "/assets/quests/diamond-necklace.png" },
  { propertyName: "Luxury Diamond Rivière Necklace", propertyType: "Diamond", location: "Bond Street, London, UK", reward: "1450.00", imageUrl: "/assets/quests/diamond-necklace.png" },
  { propertyName: "18K Gold Diamond Pendant Necklace", propertyType: "Diamond", location: "Mykonos Jewellery Boutique, Greece", reward: "920.00", imageUrl: "/assets/quests/diamond-necklace.png" },
  { propertyName: "Fancy-Cut Diamond Investment Parcel", propertyType: "Diamond", location: "Tel Aviv Diamond Exchange, Israel", reward: "1800.00", imageUrl: "/assets/quests/diamond-fancy-cut.png" },
  { propertyName: "Oval & Pear Diamond Fancy Cuts", propertyType: "Diamond", location: "Mumbai Diamond Bourse, India", reward: "1350.00", imageUrl: "/assets/quests/diamond-fancy-cut.png" },
  { propertyName: "Coloured Fancy Diamond Collection", propertyType: "Diamond", location: "Surat Diamond Park, India", reward: "1250.00", imageUrl: "/assets/quests/diamond-fancy-cut.png" },

  // ── Gold Jewelry ──────────────────────────────────────────────────────────
  { propertyName: "24K Gold Chain Necklace — 50g", propertyType: "Gold Jewelry", location: "Gold Souk, Dubai, UAE", reward: "950.00", imageUrl: "/assets/quests/gold-necklace.png" },
  { propertyName: "Italian 22K Gold Link Necklace", propertyType: "Gold Jewelry", location: "Ponte Vecchio, Florence, Italy", reward: "880.00", imageUrl: "/assets/quests/gold-necklace.png" },
  { propertyName: "Heavy Gold Byzantine Chain", propertyType: "Gold Jewelry", location: "Grand Bazaar, Istanbul, Turkey", reward: "820.00", imageUrl: "/assets/quests/gold-necklace.png" },
  { propertyName: "Gold Bullion Bar Investment — 100g", propertyType: "Gold Jewelry", location: "Swiss National Bank, Zurich, Switzerland", reward: "2200.00", imageUrl: "/assets/quests/gold-bars.png" },
  { propertyName: "Fine Gold Ingot Collection — 250g", propertyType: "Gold Jewelry", location: "London Bullion Market, London, UK", reward: "2800.00", imageUrl: "/assets/quests/gold-bars.png" },
  { propertyName: "24K Cast Gold Bar Portfolio", propertyType: "Gold Jewelry", location: "Bank of Tokyo Gold Vault, Japan", reward: "2500.00", imageUrl: "/assets/quests/gold-bars.png" },
  { propertyName: "Gold Bangle & Ring Jewellery Set", propertyType: "Gold Jewelry", location: "Chandni Chowk, New Delhi, India", reward: "750.00", imageUrl: "/assets/quests/gold-jewelry-set.png" },
  { propertyName: "18K Gold Bangles Collection", propertyType: "Gold Jewelry", location: "Gold Souk, Abu Dhabi, UAE", reward: "690.00", imageUrl: "/assets/quests/gold-jewelry-set.png" },
  { propertyName: "Traditional Gold Jewellery Set", propertyType: "Gold Jewelry", location: "Jewellery Quarter, Birmingham, UK", reward: "720.00", imageUrl: "/assets/quests/gold-jewelry-set.png" },
  { propertyName: "Rose Gold Diamond Jewellery Suite", propertyType: "Gold Jewelry", location: "Avenue Montaigne, Paris, France", reward: "1300.00", imageUrl: "/assets/quests/gold-diamond-set.png" },
  { propertyName: "White Gold & Diamond Luxury Set", propertyType: "Gold Jewelry", location: "Fifth Avenue, New York, USA", reward: "1400.00", imageUrl: "/assets/quests/gold-diamond-set.png" },
  { propertyName: "Gold Diamond Bracelet & Ring Duo", propertyType: "Gold Jewelry", location: "Marina Bay Luxury Mall, Singapore", reward: "1150.00", imageUrl: "/assets/quests/gold-diamond-set.png" },

  // ── Gemstones ─────────────────────────────────────────────────────────────
  { propertyName: "Burmese Pigeon-Blood Ruby Collection", propertyType: "Gemstone", location: "Mogok Valley, Myanmar", reward: "1700.00", imageUrl: "/assets/quests/gemstone-ruby.png" },
  { propertyName: "Certified Ruby Parcel — 20ct Total", propertyType: "Gemstone", location: "Gemfields, Mozambique", reward: "1550.00", imageUrl: "/assets/quests/gemstone-ruby.png" },
  { propertyName: "Ruby & Spinel Investment Parcel", propertyType: "Gemstone", location: "Sri Lanka Gem Bureau, Colombo", reward: "1200.00", imageUrl: "/assets/quests/gemstone-ruby.png" },
  { propertyName: "Colombian Muzo Emerald Collection", propertyType: "Gemstone", location: "Muzo Mine, Boyacá, Colombia", reward: "1900.00", imageUrl: "/assets/quests/gemstone-emerald.png" },
  { propertyName: "Zambian Emerald Gemstone Parcel", propertyType: "Gemstone", location: "Kagem Mine, Zambia", reward: "1400.00", imageUrl: "/assets/quests/gemstone-emerald.png" },
  { propertyName: "AGL-Certified Emerald Investment", propertyType: "Gemstone", location: "Idar-Oberstein Gem Centre, Germany", reward: "1600.00", imageUrl: "/assets/quests/gemstone-emerald.png" },
  { propertyName: "Kashmir Blue Sapphire Collection", propertyType: "Gemstone", location: "Padder Valley, Kashmir, India", reward: "2100.00", imageUrl: "/assets/quests/gemstone-sapphire.png" },
  { propertyName: "Ceylon Royal Blue Sapphire Set", propertyType: "Gemstone", location: "Ratnapura Gem City, Sri Lanka", reward: "1750.00", imageUrl: "/assets/quests/gemstone-sapphire.png" },
  { propertyName: "Montana Sapphire Investment Parcel", propertyType: "Gemstone", location: "Yogo Gulch, Montana, USA", reward: "1300.00", imageUrl: "/assets/quests/gemstone-sapphire.png" },
  { propertyName: "Rare Mixed Precious Gem Portfolio", propertyType: "Gemstone", location: "GIA Gemological Lab, Carlsbad, USA", reward: "2400.00", imageUrl: "/assets/quests/gemstone-mixed.png" },
  { propertyName: "Fine Coloured Gemstone Collection", propertyType: "Gemstone", location: "Hong Kong Jewellery & Gem Fair", reward: "2000.00", imageUrl: "/assets/quests/gemstone-mixed.png" },
  { propertyName: "Investment Gem Parcel — Multi-Stone", propertyType: "Gemstone", location: "Bangkok Gems & Jewellery Quarter", reward: "1800.00", imageUrl: "/assets/quests/gemstone-mixed.png" },

  // ── Luxury Watches ────────────────────────────────────────────────────────
  { propertyName: "Rolex Submariner Date — Blue Dial", propertyType: "Luxury Watch", location: "Rolex SA, Geneva, Switzerland", reward: "2500.00", imageUrl: "/assets/quests/watch-submariner.png" },
  { propertyName: "Rolex GMT-Master II Pepsi Bezel", propertyType: "Luxury Watch", location: "Les Acacias, Geneva, Switzerland", reward: "2800.00", imageUrl: "/assets/quests/watch-submariner.png" },
  { propertyName: "Rolex Daytona Gold Chronograph", propertyType: "Luxury Watch", location: "Watches of Switzerland, London, UK", reward: "3200.00", imageUrl: "/assets/quests/watch-submariner.png" },
  { propertyName: "Patek Philippe Calatrava Dress Watch", propertyType: "Luxury Watch", location: "Patek Philippe Museum, Geneva, Switzerland", reward: "3800.00", imageUrl: "/assets/quests/watch-dress.png" },
  { propertyName: "IWC Schaffhausen Portuguese Chronograph", propertyType: "Luxury Watch", location: "IWC Manufaktur, Schaffhausen, Switzerland", reward: "2200.00", imageUrl: "/assets/quests/watch-dress.png" },
  { propertyName: "A. Lange & Söhne Saxonia Thin", propertyType: "Luxury Watch", location: "Glashütte, Saxony, Germany", reward: "3500.00", imageUrl: "/assets/quests/watch-dress.png" },
  { propertyName: "Audemars Piguet Royal Oak Offshore", propertyType: "Luxury Watch", location: "Le Brassus, Vallée de Joux, Switzerland", reward: "4200.00", imageUrl: "/assets/quests/watch-royal-oak.png" },
  { propertyName: "AP Royal Oak Selfwinding Steel", propertyType: "Luxury Watch", location: "Audemars Piguet Boutique, Dubai, UAE", reward: "3600.00", imageUrl: "/assets/quests/watch-royal-oak.png" },
  { propertyName: "Royal Oak Grande Complication", propertyType: "Luxury Watch", location: "Harrods Fine Watches, London, UK", reward: "5000.00", imageUrl: "/assets/quests/watch-royal-oak.png" },
  { propertyName: "Diamond-Paved Tourbillon Masterpiece", propertyType: "Luxury Watch", location: "Jacob & Co., New York, USA", reward: "6000.00", imageUrl: "/assets/quests/watch-diamond.png" },
  { propertyName: "Baguette Diamond Skeleton Watch", propertyType: "Luxury Watch", location: "Graff Diamonds, Bond Street, London, UK", reward: "5500.00", imageUrl: "/assets/quests/watch-diamond.png" },
  { propertyName: "Full Diamond Luxury Dress Watch", propertyType: "Luxury Watch", location: "Harry Winston, Avenue Montaigne, Paris", reward: "4800.00", imageUrl: "/assets/quests/watch-diamond.png" },
];

export async function seedProperties(): Promise<void> {
  try {
    const existing = await db.select({ id: propertiesTable.id, location: propertiesTable.location }).from(propertiesTable).limit(5);

    const hasNigerianData = existing.some(p =>
      /Lagos|Abuja|Nigeria|Port Harcourt|Ibadan|Kano|Enugu|Owerri|Calabar|Benin City|Warri|Asaba|Uyo/i.test(p.location)
    );

    if (existing.length > 0 && !hasNigerianData) {
      logger.info("Properties already seeded with worldwide data, skipping");
    } else {
      await db.delete(propertiesTable);
      await db.insert(propertiesTable).values(WORLDWIDE_PROPERTIES);
      logger.info({ count: WORLDWIDE_PROPERTIES.length }, "Properties seeded with worldwide addresses");
    }

    // Always ensure luxury quest items exist
    const [{ luxuryCount }] = await db
      .select({ luxuryCount: propertiesTable.id })
      .from(propertiesTable)
      .where(or(
        like(propertiesTable.propertyType, "Diamond"),
        like(propertiesTable.propertyType, "Gold Jewelry"),
        like(propertiesTable.propertyType, "Gemstone"),
        like(propertiesTable.propertyType, "Luxury Watch"),
      ))
      .limit(1)
      .catch(() => [{ luxuryCount: null }]);

    if (!luxuryCount) {
      await db.insert(propertiesTable).values(LUXURY_QUEST_ITEMS);
      logger.info({ count: LUXURY_QUEST_ITEMS.length }, "Luxury quest items seeded");
    } else {
      logger.info("Luxury quest items already exist, skipping");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed properties");
  }
}
