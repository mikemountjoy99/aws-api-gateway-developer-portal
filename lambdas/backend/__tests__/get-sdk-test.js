const util = require('../util')
const { promiser, generateRequestContext, generateResponseContext } = require('../../setup-jest')
const catalogSdk = require('../routes/catalog/sdk')

const originalCatalog = util.catalog

describe('getSdk', () => {
  beforeEach(() => {
    util.catalog = jest.fn()
  })

  afterEach(() => {
    util.catalog = originalCatalog
  })

  test('it should return a generated SDK, proxying through params', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()

    req.params = { id: 'apiId_stageName' }
    req.query = {}
    req.query = { sdkType: 'ruby', parameters: { serviceName: 'my-new-ruby-service' } }

    util.apigateway.getSdk = jest.fn().mockReturnValue(promiser({
      body: Buffer.from('returnedSDK')
    }))

    util.catalog.mockReturnValue({
      apiGateway: [
        {
          apis: [
            {
              id: 'apiId',
              stage: 'stageName',
              sdkGeneration: true
            }
          ]
        }
      ],
      generic: {}
    })

    await catalogSdk.get(req, res)

    expect(util.catalog).toHaveBeenCalledTimes(1)

    expect(util.apigateway.getSdk).toHaveBeenCalledTimes(1)
    expect(util.apigateway.getSdk).toHaveBeenCalledWith({
      restApiId: 'apiId',
      sdkType: 'ruby',
      stageName: 'stageName',
      parameters: { serviceName: 'my-new-ruby-service' }
    })

    expect(res.send).toHaveBeenCalledTimes(1)
    expect(res.send.mock.calls[0][0]).toContain('data:application/zip;base64,')
  })

  test('it should not return SDKs for APIs not in the catalog', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()

    req.params = { id: 'anApi_notInTheCatalog' }
    req.query = { sdkType: 'ruby', parameters: { serviceName: 'my-new-ruby-service' } }

    util.catalog.mockReturnValue({
      apiGateway: [
        {
          apis: [
            {
              id: 'apiId',
              stage: 'stageName',
              sdkGeneration: true
            }
          ]
        }
      ],
      generic: {}
    })

    await catalogSdk.get(req, res)

    expect(util.catalog).toHaveBeenCalledTimes(1)

    expect(util.apigateway.getSdk).toHaveBeenCalledTimes(0)

    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.status().json).toHaveBeenCalledTimes(1)
    expect(res.status().json).toHaveBeenCalledWith({ message: 'API with ID (anApi) and Stage (notInTheCatalog) could not be found.' })
  })

  test('it should not return SDKs for APIs in the catalog but with SDK generation disabled', async () => {
    const req = generateRequestContext()
    const res = generateResponseContext()

    req.params = { id: 'thisApi_shouldNotGenerateSDKs' }
    req.query = {}
    req.query.sdkType = 'whitespace'
    req.query = { sdkType: 'ruby', parameters: { serviceName: 'my-new-ruby-service' } }

    util.catalog.mockReturnValue({
      apiGateway: [
        {
          apis: [
            {
              id: 'apiId',
              stage: 'stageName',
              sdkGeneration: true
            },
            {
              id: 'thisApi',
              stage: 'shouldNotGenerateSDKs',
              sdkGeneration: false
            }
          ]
        }
      ],
      generic: {}
    })

    await catalogSdk.get(req, res)

    expect(util.catalog).toHaveBeenCalledTimes(1)

    expect(util.apigateway.getSdk).toHaveBeenCalledTimes(0)

    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.status().json).toHaveBeenCalledTimes(1)
    expect(res.status().json).toHaveBeenCalledWith({ message: 'API with ID (thisApi) and Stage (shouldNotGenerateSDKs) is not enabled for SDK generation.' })
  })
})
