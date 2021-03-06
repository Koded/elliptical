import _ from 'lodash'

export default function (type, props, ...children) {
  return {
    type,
    props: props == null ? {} : props,
    children: _.chain(children).flattenDeep().filter().value()
  }
}
