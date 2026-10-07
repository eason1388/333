// Iztro's default ten-stem table; the four positions are 祿、權、科、忌.
// Wenmo can use a different user-selected table, so these are labelled as
// default-rule results rather than verified Wenmo computations.
export const FOUR_TYPES=['祿','權','科','忌'];
export const STEM_MUTAGEN_STARS={
  甲:['廉貞','破軍','武曲','太陽'],
  乙:['天機','天梁','紫微','太陰'],
  丙:['天同','天機','文昌','廉貞'],
  丁:['太陰','天同','天機','巨門'],
  戊:['貪狼','太陰','右弼','天機'],
  己:['武曲','貪狼','天梁','文曲'],
  庚:['太陽','武曲','太陰','天同'],
  辛:['巨門','太陽','文曲','文昌'],
  壬:['天梁','紫微','左輔','武曲'],
  癸:['破軍','巨門','太陰','貪狼']
};

export function palaceFlights(chart,source){
  if(!source || !chart?.palaces)return [];
  const imported=chart.fourTable?.[source.stem];
  const stars=imported?.length===4?imported:STEM_MUTAGEN_STARS[source.stem];
  if(!stars)return [];
  return stars.map((star,index)=>{
    const target=chart.palaces.find(palace=>palace.stars.some(item=>item.name===star));
    return {type:FOUR_TYPES[index],star,source,target:target||null,self:!!target&&target.branch===source.branch};
  });
}
