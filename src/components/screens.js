// Ánh xạ id màn hình -> component (dữ liệu thuần nằm ở game/screens.js).
import CharacterTab from './tabs/CharacterTab.vue'
import BattleTab from './tabs/BattleTab.vue'
import InventoryTab from './tabs/InventoryTab.vue'
import DwellingTab from './tabs/DwellingTab.vue'
import SettingsTab from './tabs/SettingsTab.vue'
import SkillsTab from './tabs/SkillsTab.vue'
import EquipmentTab from './tabs/EquipmentTab.vue'
import AchievementsTab from './tabs/AchievementsTab.vue'
import GardenTab from './tabs/GardenTab.vue'
import ReincarnationTab from './tabs/ReincarnationTab.vue'
import SectTab from './tabs/SectTab.vue'
import DisciplesTab from './tabs/DisciplesTab.vue'
import JourneyTab from './tabs/JourneyTab.vue'
import StoryTab from './tabs/StoryTab.vue'

export const SCREEN_COMPONENTS = {
  character: CharacterTab,
  skills: SkillsTab,
  pets: SkillsTab,
  gear: EquipmentTab,
  battle: BattleTab,
  inventory: InventoryTab,
  sect: SectTab,
  disciples: DisciplesTab,
  dwelling: DwellingTab,
  garden: GardenTab,
  reincarnation: ReincarnationTab,
  story: StoryTab,
  journey: JourneyTab,
  achievements: AchievementsTab,
  settings: SettingsTab,
}
