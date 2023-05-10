export function chunkArrayInGroups(arr: any[], size: number) {
  const myArray = []
  for (let i = 0; i < arr.length; i += size) {
    myArray.push(arr.slice(i, i + size))
  }
  return myArray
}
