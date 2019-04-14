import { Component } from 'react';
import { compose } from 'redux';
import { connect } from 'dva';
import { Field, FieldArray, formValueSelector, reduxForm } from 'redux-form';
import { Button, Col, Form, Icon, Layout, Row, Select } from 'antd';
import { forEach, get, isString, includes, has, lowerCase, map, sumBy } from 'lodash';

import router from 'umi/router';
import currency from 'currency.js';
import currencyToSymbolMap from 'currency-symbol-map/map';

import { ADatePicker, AInput, ASelect, ATextarea } from '../../../components/forms/fields';
import { required } from '../../../components/forms/validators';
import LineItems from '../../../components/invoices/line-items';
import FooterToolbar from '../../../components/layout/footer-toolbar';

class InvoiceForm extends Component {
  componentDidMount() {
    if (!this.isNew()) {
      this.props.dispatch({
        type: 'invoices/initialize',
        payload: {
          id: get(this.props, ['match', 'params', 'id']),
        },
      });
    }
    this.props.dispatch({ type: 'clients/list' });
    this.props.dispatch({ type: 'taxRates/list' });
  }

  isNew = () => {
    const {
      match: { params },
    } = this.props;

    return has(params, 'id') && params['id'] === 'new';
  };

  clientSelect = value => {
    if (value === 'new') {
      const {
        match: { params },
      } = this.props;

      router.push({
        pathname: `/invoices/${get(params, 'id', 'new')}/client`,
      });
    }
  };

  render() {
    const {
      children,
      clients,
      handleSubmit,
      lineItems,
      pristine,
      submitting,
      taxRates,
    } = this.props;

    // Calculate totals
    let subTotal = currency(0, { separator: '' });
    let taxTotal = currency(0, { separator: '' });
    let total = currency(0, { separator: '' });
    forEach(lineItems, line => {
      if (has(line, 'subtotal')) {
        subTotal = subTotal.add(line.subtotal);
        if (has(line, 'taxRate')) {
          const taxRate = get(taxRates.items, line.taxRate);
          if (taxRate) {
            const lineTax = currency(line.subtotal).multiply(taxRate.percentage / 100);
            taxTotal = taxTotal.add(lineTax);
          }
        }
      }
    });

    return (
      <Layout.Content style={{ margin: '16px 16px 72px 16px', padding: 24, background: '#fff' }}>
        <Form onSubmit={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Field
                showSearch
                name="client"
                placeholder="Select or create a client"
                component={ASelect}
                label="Client"
                onSelect={this.clientSelect}
                optionFilterProp="children"
                filterOption={(input, option) => {
                  const clientName = get(option, ['props', 'children']);
                  if (isString(clientName)) {
                    return includes(lowerCase(clientName), lowerCase(input));
                  }
                  return true;
                }}
                validate={[required]}
              >
                {map(clients.items, (client, id) => (
                  <Select.Option value={id} key={id}>
                    {get(client, 'name', '-')}
                  </Select.Option>
                ))}
                <Select.Option value="new" key="new" style={{ borderTop: '1px solid #e8e8e8' }}>
                  <Icon type="user-add" />
                  {` Create new client`}
                </Select.Option>
              </Field>
            </Col>
            <Col span={6}>
              <Field
                name="number"
                component={AInput}
                label="Invoice number"
                validate={[required]}
              />
            </Col>
            <Col span={6}>
              <Field
                showSearch
                name="currency"
                component={ASelect}
                label="Currency"
                validate={[required]}
              >
                {map(currencyToSymbolMap, (symbol, currency) => (
                  <Select.Option value={currency} key={currency}>
                    {`${currency} ${symbol}`}
                  </Select.Option>
                ))}
              </Field>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6} offset={12}>
              <Field
                name="date"
                component={ADatePicker}
                label="Date"
                style={{ width: '100%' }}
                validate={[required]}
              />
            </Col>
            <Col span={6}>
              <Field
                name="due_date"
                component={ADatePicker}
                label="Due date"
                style={{ width: '100%' }}
              />
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: '20px' }}>
            <Col>
              <FieldArray name="lineItems" component={LineItems} />
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8} style={{ marginTop: '20px' }}>
              <Field name="customer_note" component={ATextarea} label="Customer note" rows={4} />
            </Col>
            <Col span={12} offset={4} style={{ marginTop: '20px' }}>
              <table style={{ width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'right', width: '50%' }}>
                      <h4>Subtotal</h4>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <h4>{subTotal.format()}</h4>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'right' }}>Tax</td>
                    <td style={{ textAlign: 'right' }}>{taxTotal.format()}</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'right', paddingTop: 24 }}>
                      <h2>Total</h2>
                    </td>
                    <td style={{ textAlign: 'right', paddingTop: 24 }}>
                      <h2>{subTotal.add(taxTotal).format()}</h2>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Col>
          </Row>

          <FooterToolbar>
            <Button style={{ marginTop: '10px' }}>
              <Icon type="file-pdf" />
              Download PDF
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              disabled={pristine || submitting}
              loading={submitting}
              style={{ marginTop: '10px' }}
            >
              <Icon type="save" />
              Save invoice
            </Button>
          </FooterToolbar>
        </Form>

        {children}
      </Layout.Content>
    );
  }
}

const selector = formValueSelector('invoice');

export default compose(
  connect(state => ({
    clients: state.clients,
    taxRates: state.taxRates,
    lineItems: selector(state, 'lineItems'),
  })),
  reduxForm({
    form: 'invoice',
    initialValues: {
      currency: 'EUR',
      lineItems: [{}],
    },
    onSubmit: async (data, dispatch) => {
      return await dispatch({ type: 'invoices/save', data: data });
    },
  })
)(InvoiceForm);
