export function defineFn(fn: () => any): PromiseLike<any> {
  return {
    then: (resolve: any, reject: any) => {
      resolve(fn())
    },
  }
}
