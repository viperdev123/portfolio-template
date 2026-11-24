export interface Preset {
  name: string; tabs: string[]; activeColor: string
  textColor: string; numColor: string; numLineColor: string; activeTextColor: string;
}

export const PRESETS: Preset[] = [
  { name: 'Navy & Gold', tabs: ['#001043', '#0A1B5C', '#14297A', '#1E3A8F', '#2A4494'],
    activeColor: '#E3B04B', textColor: '#FFFFFF', numColor: '#F3D27A', numLineColor: '#F3D27A',
    activeTextColor: '#001043' },
  { name: 'เขียวเข้ม & ทอง', tabs: ['#05301F', '#0A3D2A', '#104B35', '#175A41', '#1F694D'],
    activeColor: '#E3B04B', textColor: '#FFFFFF', numColor: '#F3D27A', numLineColor: '#F3D27A',
    activeTextColor: '#05301F' },
  { name: 'เทาถ่าน & ทอง', tabs: ['#1C1F24', '#262A31', '#30353D', '#3A404A', '#454C57'],
    activeColor: '#E3B04B', textColor: '#FFFFFF', numColor: '#F3D27A', numLineColor: '#F3D27A',
    activeTextColor: '#1C1F24' },
]
