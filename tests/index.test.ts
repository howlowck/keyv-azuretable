import { greet } from '../src/index'

test('name is string', () => {
  expect(greet('Bob')).toEqual('Hello Bob!')
})
